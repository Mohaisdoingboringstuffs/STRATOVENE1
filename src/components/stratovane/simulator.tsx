"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AltitudeResponse,
  Meta,
  SweepResponse,
  TransientResponse,
  api,
  fmt,
  materialColor,
} from "@/lib/strato-api";
import { ChartFrame, ErrorNote, MonoStat, NumberField, Spinner } from "./ui";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Props = { meta: Meta | null };

const DEFAULT_SELECTED = [
  "STRATOVANE_AAO_LITERATURE",
  "BARE_ALUMINUM_OXIDIZED",
  "ANODIZED_AL_DLR_2022",
  "WHITE_REFERENCE_PLACEHOLDER",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

function useDebounced(value: unknown, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Simulator({ meta }: Props) {
  const [altitudeKm, setAltitudeKm] = useState(20);
  const [wind, setWind] = useState(5);
  const [heat, setHeat] = useState(20);
  const [solarScale, setSolarScale] = useState(1);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  const [sweep, setSweep] = useState<SweepResponse | null>(null);
  const [current, setCurrent] = useState<AltitudeResponse | null>(null);
  const [transient, setTransient] = useState<TransientResponse | null>(null);
  const [lab, setLab] = useState<"transient" | "spectral" | "uncertainty" | "benchmark" | "experiment">(
    "transient"
  );

  const [errSweep, setErrSweep] = useState<string | null>(null);
  const [errCurrent, setErrCurrent] = useState<string | null>(null);
  const [errTransient, setErrTransient] = useState<string | null>(null);
  const [busy, setBusy] = useState({ sweep: false, current: false, transient: false });

  const dAlt = useDebounced(altitudeKm, 250);
  const dWind = useDebounced(wind, 350);
  const dHeat = useDebounced(heat, 350);
  const dSolar = useDebounced(solarScale, 350);
  const dSelected = useDebounced(selected, 350);

  // --- altitude sweep (slow-ish; only on material/wind/heat change) ---------
  useEffect(() => {
    if (!meta || dSelected.length === 0) return;
    let alive = true;
    (async () => {
      setBusy((b) => ({ ...b, sweep: true }));
      try {
        const s = await api.sweep({ materials: dSelected, wind: dWind, heat_load: dHeat });
        if (!alive) return;
        setSweep(s);
        setErrSweep(null);
      } catch (e) {
        if (alive) setErrSweep(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setBusy((b) => ({ ...b, sweep: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [meta, dSelected, dWind, dHeat]);

  // --- current-altitude point ------------------------------------------------
  useEffect(() => {
    if (!meta || dSelected.length === 0) return;
    let alive = true;
    (async () => {
      setBusy((b) => ({ ...b, current: true }));
      try {
        const r = await api.altitude({
          materials: dSelected,
          altitude: dAlt * 1000,
          wind: dWind,
          heat_load: dHeat,
          solar_scale: dSolar,
        });
        if (!alive) return;
        setCurrent(r);
        setErrCurrent(null);
      } catch (e) {
        if (alive) setErrCurrent(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setBusy((b) => ({ ...b, current: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [meta, dSelected, dAlt, dWind, dHeat, dSolar]);

  // --- 24h transient ----------------------------------------------------------
  useEffect(() => {
    if (lab !== "transient" || !meta || dSelected.length === 0) return;
    let alive = true;
    (async () => {
      setBusy((b) => ({ ...b, transient: true }));
      try {
        const r = await api.transient({
          materials: dSelected,
          altitude: dAlt * 1000,
          wind: dWind,
          heat_load: dHeat,
        });
        if (!alive) return;
        setTransient(r);
        setErrTransient(null);
      } catch (e) {
        if (alive) setErrTransient(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setBusy((b) => ({ ...b, transient: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [lab, meta, dSelected, dAlt, dWind, dHeat]);

  const toggleMaterial = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }, []);

  // merged sweep rows for the main chart
  const sweepRows = useMemo(() => {
    if (!sweep) return [];
    const rows: Record<string, number>[] = [];
    const n = sweep.t_air_profile.length;
    for (let i = 0; i < n; i++) {
      const row: Record<string, number> = {
        alt: sweep.t_air_profile[i].alt_km,
        Tair: sweep.t_air_profile[i].t_air_c,
      };
      for (const [mid, r] of Object.entries(sweep.results)) {
        row[mid] = r.t_electronics[i];
      }
      rows.push(row);
    }
    return rows;
  }, [sweep]);

  const transientRows = useMemo(() => {
    if (!transient) return [];
    const first = Object.values(transient.results)[0];
    if (!first) return [];
    return first.time.map((t, i) => {
      const row: Record<string, number> = { h: t / 3600 };
      for (const [mid, r] of Object.entries(transient.results)) {
        row[mid] = r.t_electronics[i];
      }
      return row;
    });
  }, [transient]);

  const scenario = current?.scenario;
  const hMean =
    current && Object.values(current.results).length
      ? Object.values(current.results).reduce((s, r) => s + r.h_conv, 0) /
        Object.values(current.results).length
      : null;

  return (
    <div className="space-y-8">
      {/* ------------------------------ controls ------------------------------ */}
      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="grid gap-x-8 gap-y-6 px-5 py-5 md:grid-cols-4">
          <SliderControl
            label="Altitude"
            value={altitudeKm}
            unit="km"
            min={0}
            max={25}
            step={0.5}
            onChange={setAltitudeKm}
            hint="0 = sea level · 20 km = stratospheric cruise"
          />
          <SliderControl
            label="Wind speed"
            value={wind}
            unit="m/s"
            min={0}
            max={15}
            step={0.5}
            onChange={setWind}
            hint="Assumed airflow over the box: the biggest lever in the model"
          />
          <SliderControl
            label="Electronics heat"
            value={heat}
            unit="W"
            min={0}
            max={50}
            step={1}
            onChange={setHeat}
            hint="Scenario value, not flight data"
          />
          <SliderControl
            label="Solar scale"
            value={solarScale}
            unit="×"
            min={0}
            max={1.5}
            step={0.05}
            onChange={setSolarScale}
            hint="Scales the clear-sky irradiance (1.00 = model default)"
          />
        </div>
        <div className="border-t border-zinc-100 px-5 py-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Surfaces to compare (α = solar absorptance, ε = IR emissivity), up to 5
          </p>
          <div className="flex flex-wrap gap-2">
            {(meta?.materials ?? []).map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMaterial(m.id)}
                  aria-pressed={on}
                  className={cn(
                    "group flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    on
                      ? "border-zinc-800 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  )}
                  title={`${m.name} (status: ${m.status})`}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: materialColor(m.id) }}
                  />
                  <span className="font-medium">{shortName(m.id)}</span>
                  <span className={cn("font-mono text-[10px]", on ? "text-zinc-400" : "text-zinc-400")}>
                    α{m.alpha.toFixed(2)} ε{m.epsilon.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------- scenario strip --------------------------- */}
      <section className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-lg border border-zinc-200 bg-zinc-50/60 px-5 py-4">
        <MonoStat label="Air temp" value={scenario ? `${fmt(scenario.t_air_c)} °C` : "···"} hint="US76 @ altitude" />
        <MonoStat label="Effective sky" value={scenario ? `${fmt(scenario.t_sky_c)} °C` : "···"} hint="Dai-Fang broadband" />
        <MonoStat label="Pressure" value={scenario ? `${(scenario.pressure_ratio * 100).toFixed(1)} %` : "···"} hint="of sea level" />
        <MonoStat label="Density" value={scenario ? `${(scenario.density_ratio * 100).toFixed(1)} %` : "···"} hint="of sea level" />
        <MonoStat label="Convection h" value={hMean != null ? `${fmt(hMean, 2)} W/m²K` : "···"} hint={`at ${wind.toFixed(1)} m/s wind`} />
        <MonoStat
          label="Energy residual"
          value={
            current && Object.values(current.results).length
              ? `${Math.max(...Object.values(current.results).map((r) => r.residual)).toExponential(1)}`
              : "···"
          }
          hint="max across surfaces"
        />
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
          {(busy.sweep || busy.current || busy.transient) && <Spinner />}
          {current?.metadata.solar_scale_applied === false && solarScale !== 1
            ? "solar scale pending"
            : null}
        </div>
      </section>

      <ErrorNote message={errSweep || errCurrent} />

      {/* --------------------------- altitude chart --------------------------- */}
      <ChartFrame
        title="Electronics temperature vs altitude"
        caption="Solid lines: steady-state electronics temperature for each selected surface. Dashed line: ambient air temperature (US76). Dots: current slider altitude. The gap between surfaces is the coating effect; the gap to the dashed line is how far the box sits from its environment."
      >
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sweepRows} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" />
              <XAxis
                dataKey="alt"
                type="number"
                domain={[0, 25]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(v: number) => `${v}`}
                label={{ value: "Altitude (km)", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#a1a1aa" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
                width={44}
                label={{ value: "T (°C)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a1a1aa" }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number | string, n: string) => [`${fmt(Number(v))} °C`, legendName(n)]}
                labelFormatter={(l) => `${l} km`}
              />
              <Legend
                formatter={legendName}
                iconType="plainline"
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Line
                type="monotone"
                dataKey="Tair"
                stroke="#a1a1aa"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              {Object.keys(sweep?.results ?? {}).map((mid) => (
                <Line
                  key={mid}
                  type="monotone"
                  dataKey={mid}
                  stroke={materialColor(mid)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              {Object.entries(current?.results ?? {}).map(([mid, r]) => {
                const val = r?.t_electronics;
                if (val == null) return null;
                return (
                  <ReferenceDot
                    key={`dot-${mid}`}
                    x={dAlt}
                    y={val}
                    r={4.5}
                    fill={materialColor(mid)}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {/* ------------------------ heat rejection chart ------------------------ */}
      <ChartFrame
        title="Where the heat goes (steady state at current settings)"
        caption="Negative solar = heat absorbed from the sun. Radiation and convection must carry the electronics load plus the absorbed solar. If the convection bar dwarfs radiation at altitude, that is the assumed wind doing the work; set wind to 0 to see the radiation-only case."
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={Object.entries(current?.results ?? {}).map(([mid, r]) => ({
                name: shortName(mid),
                Radiation: r.q_env.rad,
                Convection: r.q_env.conv,
                "Absorbed solar": r.q_env.solar,
                color: materialColor(mid),
              }))}
              margin={{ top: 8, right: 24, bottom: 4, left: 0 }}
            >
              <CartesianGrid stroke="#f4f4f5" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={44} label={{ value: "W", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string, n: string) => [`${fmt(Number(v))} W`, n]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Radiation" fill="#3f3f46" />
              <Bar dataKey="Convection" fill="#a1a1aa" />
              <Bar dataKey="Absorbed solar" fill="#fdba74" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      <ErrorNote message={errTransient} />

      {/* ------------------------------- lab tabs ------------------------------ */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200">
        {(
          [
            ["transient", "24 h day/night cycle"],
            ["spectral", "Spectral optics"],
            ["uncertainty", "Uncertainty"],
            ["benchmark", "Literature benchmark"],
            ["experiment", "Experiment data"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLab(key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              lab === key
                ? "border-orange-600 font-medium text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {lab === "transient" && (
        <TransientPanel transient={transient} rows={transientRows} selected={dSelected} />
      )}
      {lab === "spectral" && <SpectralPanel selected={dSelected} />}
      {lab === "uncertainty" && <UncertaintyPanel meta={meta} altitudeKm={dAlt} />}
      {lab === "benchmark" && <BenchmarkPanel />}
      {lab === "experiment" && <ExperimentPanel />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-panels                                                          */
/* ------------------------------------------------------------------ */

function TransientPanel({
  transient,
  rows,
  selected,
}: {
  transient: TransientResponse | null;
  rows: Record<string, number>[];
  selected: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(transient?.results ?? {}).map(([mid, r]) => (
          <div key={mid} className="rounded-lg border border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: materialColor(mid) }}
              />
              <p className="truncate text-xs font-medium text-zinc-700">{shortName(mid)}</p>
            </div>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-zinc-950">
              {fmt(r.metrics.min)} → {fmt(r.metrics.max)} °C
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              <span>swing {fmt(r.metrics.swing)} K</span>
              {r.metrics.overcool_risk && (
                <span className="rounded-sm bg-sky-100 px-1.5 py-0.5 font-medium text-sky-800">
                  below 0 °C: overcooling risk
                </span>
              )}
              {r.metrics.overheat_above_50 && (
                <span className="rounded-sm bg-red-100 px-1.5 py-0.5 font-medium text-red-800">
                  above 50 °C: overheat risk
                </span>
              )}
            </div>
          </div>
        ))}
        {selected.length === 0 && (
          <p className="text-sm text-zinc-400">Select at least one surface above.</p>
        )}
      </div>

      <ChartFrame
        title="Electronics temperature over a 24 h cycle"
        caption="Sunrise/sunset geometry from the model's solar position (June 21, 35°N by default). The dashed red line is the 0 °C electronics lower limit: a treated box with a full sky view can overcool at night as well as overheat by day, so both ends need checking."
      >
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" />
              <XAxis
                dataKey="h"
                type="number"
                domain={[0, 24]}
                ticks={[0, 6, 12, 18, 24]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                label={{ value: "UTC hour", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#a1a1aa" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={44} label={{ value: "T (°C)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number | string, n: string) => [`${fmt(Number(v))} °C`, legendName(n)]}
                labelFormatter={(l) => `${Math.floor(Number(l))}:${String(Math.round((Number(l) % 1) * 60)).padStart(2, "0")} UTC`}
              />
              <Legend formatter={legendName} iconType="plainline" wrapperStyle={{ fontSize: "11px" }} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="6 4" label={{ value: "0 °C limit", fontSize: 10, fill: "#dc2626", position: "insideBottomRight" }} />
              {selected.map((mid) => (
                <Line
                  key={mid}
                  type="monotone"
                  dataKey={mid}
                  stroke={materialColor(mid)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </div>
  );
}

function SpectralPanel({ selected }: { selected: string[] }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.spectral>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (selected.length === 0) return;
    let alive = true;
    api
      .spectral({ materials: selected })
      .then((d) => alive && (setData(d), setErr(null)))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [selected]);

  const rows = useMemo(() => {
    if (!data) return [];
    const first = Object.values(data.results)[0];
    if (!first) return [];
    return first.thermal.wavelength.map((lam, i) => {
      const row: Record<string, number> = { lam: Number((lam * 1e6).toFixed(2)) };
      for (const [mid, r] of Object.entries(data.results)) {
        row[mid] = r.thermal.emissivity[i];
      }
      return row;
    });
  }, [data]);

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <ChartFrame
        title="Spectral emissivity (thermal infrared)"
        caption="The shaded band is the 8-13 µm atmospheric window, the only clear channel to space. High emissivity inside the window is what makes a surface a good radiator; what happens outside the window barely matters for heat rejection."
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 12, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" />
              <XAxis
                dataKey="lam"
                type="number"
                domain={[2, 50]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                label={{ value: "Wavelength (µm)", position: "insideBottom", offset: -6, fontSize: 11, fill: "#a1a1aa" }}
              />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#71717a" }} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string, n: string) => [fmt(Number(v), 2), legendName(n)]} labelFormatter={(l) => `${l} µm`} />
              <Legend formatter={legendName} iconType="plainline" wrapperStyle={{ fontSize: "11px" }} />
              <ReferenceArea x1={8} x2={13} fill="#e4e4e7" fillOpacity={0.5} stroke="none" />
              {Object.keys(data?.results ?? {}).map((mid) => (
                <Line
                  key={mid}
                  type="monotone"
                  dataKey={mid}
                  stroke={materialColor(mid)}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </div>
  );
}

function UncertaintyPanel({ meta, altitudeKm }: { meta: Meta | null; altitudeKm: number }) {
  const [n, setN] = useState(2000);
  const [seed, setSeed] = useState(42);
  const [material, setMaterial] = useState<string>("STRATOVANE_AAO_LITERATURE");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.job>> | null>(null);
  const [tornado, setTornado] = useState<Awaited<ReturnType<typeof api.sensitivity>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const materialList = meta?.materials ?? [];
  // Derived: falls back to the project surface when the stored id is unavailable.
  const activeMaterial = materialList.some((m) => m.id === material)
    ? material
    : "STRATOVANE_AAO_LITERATURE";

  // tornado (one-at-a-time sensitivity)
  useEffect(() => {
    let alive = true;
    api
      .sensitivity({ material: activeMaterial, altitude: altitudeKm * 1000 })
      .then((t) => alive && setTornado(t))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeMaterial, altitudeKm]);

  const runMC = async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const { job_id } = await api.montecarlo({ material: activeMaterial, altitude: altitudeKm * 1000, n, seed });
      pollRef.current = setInterval(async () => {
        const st = await api.job(job_id);
        if (st.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setResult(st);
          setRunning(false);
        } else if (st.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setErr(st.error ?? "Monte Carlo job failed");
          setRunning(false);
        }
      }, 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const histRows = useMemo(() => {
    if (!result?.result) return [];
    const xs = result.result.histogram;
    if (xs.length === 0) return [];
    const bins = 28;
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const w = (hi - lo) / bins || 1;
    const counts = new Array(bins).fill(0);
    for (const x of xs) {
      const i = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / w)));
      counts[i]++;
    }
    return counts.map((c, i) => ({
      mid: Number((lo + w * (i + 0.5)).toFixed(1)),
      count: c,
      p5: result.result!.p5,
      p95: result.result!.p95,
      mean: result.result!.mean,
    }));
  }, [result]);

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <section className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-zinc-500">
            Surface
            <select
              value={activeMaterial}
              onChange={(e) => setMaterial(e.target.value)}
              className="mt-1 block h-8 w-56 rounded-[3px] border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none transition-colors hover:border-zinc-400 focus:border-zinc-900"
            >
              {materialList.map((m) => (
                <option key={m.id} value={m.id}>
                  {shortName(m.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Samples
            <NumberField
              label="Monte Carlo samples"
              value={n}
              onChange={(v) => setN(Math.round(v))}
              min={100}
              max={10000}
              step={100}
              className="mt-1 block"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Seed
            <NumberField
              label="Random seed"
              value={seed}
              onChange={(v) => setSeed(Math.round(v))}
              min={0}
              max={999999}
              step={1}
              className="mt-1 block"
            />
          </label>
          <button
            onClick={runMC}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running && <Spinner className="border-zinc-600 border-t-white" />}
            {running ? "Running…" : "Run Monte Carlo"}
          </button>
          <p className="ml-auto max-w-xs text-[11px] leading-snug text-zinc-400">
            Spreads optical (α, ε), sky, convection and load uncertainties through the steady
            solver. Covers parameter uncertainty only, not model-form error.
          </p>
        </div>
      </section>

      {result?.result && (
        <ChartFrame
          title={`Monte Carlo: electronics temperature (n=${result.result.histogram.length})`}
          caption={`mean ${fmt(result.result.mean)} °C · median ${fmt(result.result.median)} °C · 5-95% ${fmt(result.result.p5)} to ${fmt(result.result.p95)} °C · σ ${fmt(result.result.std, 2)} K`}
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histRows} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#f4f4f5" />
                <XAxis
                  dataKey="mid"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickFormatter={(v: number) => `${v.toFixed(0)}`}
                  label={{ value: "T electronics (°C)", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#a1a1aa" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={44} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number | string) => [`${v} samples`, "count"]}
                  labelFormatter={(l) => `${l} °C`}
                />
                <Bar dataKey="count" fill="#3f3f46" />
                <ReferenceLine x={Number(result.result.mean.toFixed(1))} stroke="#ea580c" strokeWidth={1.5} label={{ value: "mean", fontSize: 10, fill: "#ea580c", position: "top" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      )}

      {tornado && (
        <ChartFrame
          title="One-at-a-time sensitivity (tornado)"
          caption="Half-range swing of each parameter around the current scenario. Rank orders what is worth measuring first."
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={tornado.tornado.map(([name, v]) => ({ name: name.replace(/_/g, " "), v }))}
                margin={{ top: 8, right: 24, bottom: 4, left: 60 }}
              >
                <CartesianGrid stroke="#f4f4f5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} label={{ value: "ΔT (K)", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#a1a1aa" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} width={150} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string) => `${fmt(Number(v), 2)} K`} />
                <Bar dataKey="v" fill="#ea580c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      )}
    </div>
  );
}

function BenchmarkPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.benchmark>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .benchmark()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const sweepRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.modeled.wind_sweep).map(([w, v]) => ({
      wind: Number(w),
      AAO: v.T_AAO_C,
      Bare: v.T_bare_C,
    }));
  }, [data]);

  if (err) return <ErrorNote message={err} />;
  if (!data) return <p className="flex items-center gap-2 text-sm text-zinc-400"><Spinner /> Re-running the Díaz-Lobo ground-test case…</p>;

  return (
    <div className="space-y-6">
      <ChartFrame
        title="Reproduction of the CSIC ground test (Díaz-Lobo et al. 2024)"
        caption="This is a validation exercise, not a tuning target: the paper's 8.0 °C is vs an insulated empty-box reference and its 175 W/m² is a calculated peak at the hot surface with an assumed h = 12 W/m²K. Neither definition matches a bare-Al contrast at ambient, so the residual gap is expected and documented rather than tuned away."
      >
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Paper reports</th>
                <th className="px-3 py-2 font-medium">This model</th>
                <th className="px-3 py-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] tabular-nums">
              <tr className="border-b border-zinc-100">
                <td className="px-3 py-2 font-sans text-zinc-700">ΔT contrast (AAO vs bare-Al, °C)</td>
                <td className="px-3 py-2">{fmt(data.reported.deltaT_C, 2)}</td>
                <td className="px-3 py-2">{fmt(data.modeled.deltaT_contrast_C, 2)}</td>
                <td className="px-3 py-2 text-zinc-500">{fmt(data.modeled.deltaT_contrast_C - data.reported.deltaT_C, 2)}</td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="px-3 py-2 font-sans text-zinc-700">AAO below ambient (°C)</td>
                <td className="px-3 py-2 font-sans text-zinc-400">definition mismatch</td>
                <td className="px-3 py-2">{fmt(data.modeled.deltaT_subambient_AAO_C, 2)}</td>
                <td className="px-3 py-2 text-zinc-400">n/a</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-sans text-zinc-700">Peak cooling (W/m²)</td>
                <td className="px-3 py-2">{fmt(data.reported.peak_cooling_W_m2, 1)}</td>
                <td className="px-3 py-2">{fmt(data.modeled.peak_cooling_at_ambient_W_m2, 1)}</td>
                <td className="px-3 py-2 text-zinc-500">{fmt(data.modeled.peak_cooling_at_ambient_W_m2 - data.reported.peak_cooling_W_m2, 1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartFrame>

      <ChartFrame title="Wind sweep for the same case" caption="Convection stiffens with wind and shrinks the apparent contrast, the same lever as at altitude.">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sweepRows} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" />
              <XAxis dataKey="wind" tick={{ fontSize: 11, fill: "#71717a" }} label={{ value: "wind (m/s)", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={44} label={{ value: "T (°C)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string, n: string) => [`${fmt(Number(v))} °C`, n]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="AAO" stroke="#ea580c" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Bare" stroke="#3f3f46" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </div>
  );
}

function ExperimentPanel() {
  const [result, setResult] = useState<{ rmse: number; bias: number; n: number; source: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadExample = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.experimentExample();
      setResult({ rmse: d.metrics.rmse, bias: d.metrics.bias, n: d.metrics.n, source: "synthetic example (placeholder)" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.experimentUpload(file);
      setResult({ rmse: d.metrics.rmse, bias: d.metrics.bias, n: d.metrics.n, source: file.name });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <section className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-500">
            Upload test CSV
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </label>
          <button
            onClick={loadExample}
            disabled={busy}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            Load synthetic example
          </button>
          <p className="text-[11px] text-zinc-400">
            Columns needed: timestamp, sample, surface_temperature_C, internal_temperature_C,
            ambient_temperature_C, humidity_percent, wind_speed_m_s, irradiance_W_m2
          </p>
        </div>
      </section>
      {result && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Model RMSE</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{fmt(result.rmse, 2)} °C</p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Bias</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{fmt(result.bias, 2)} °C</p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Rows</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{result.n}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Source</p>
            <p className="mt-1 truncate font-mono text-xs" title={result.source}>{result.source}</p>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const SHORT_NAMES: Record<string, string> = {
  BARE_ALUMINUM_POLISHED: "Bare Al · polished",
  BARE_ALUMINUM_OXIDIZED: "Bare Al · oxidized",
  BARE_ALUMINUM_ROUGH: "Bare Al · rough",
  WHITE_REFERENCE_PLACEHOLDER: "White paint ref",
  AAO_AL_DIAZ_LOBO: "AAO (CSIC lit.)",
  STRATOVANE_AAO_LITERATURE: "STRATOVANE AAO",
  STRATOVANE_AAO_MEASURED: "AAO (measured)",
  AAO_OPTIONAL_RS94: "AAO opt. Rs94",
  AAO_OPTIONAL_EPS97: "AAO opt. ε97",
  ANODIZED_AL_DLR_2022: "Anodized Al (DLR)",
};

export function shortName(id: string) {
  return SHORT_NAMES[id] ?? id.replaceAll("_", " ").toLowerCase();
}

function legendName(v: string) {
  return shortName(v);
}

function SliderControl({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</label>
        <NumberField
          label={label}
          value={value}
          unit={unit}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals: number[]) => onChange(vals[0])}
        aria-label={label}
      />
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">{hint}</p> : null}
    </div>
  );
}
