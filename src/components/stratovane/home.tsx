"use client";

import { Meta } from "@/lib/strato-api";
import { Kicker, Stat } from "./ui";

const SOURCES = [
  {
    label: "CSIC 2024",
    detail: "Díaz-Lobo et al., ACS Appl. Opt. Mater. 2, 980-990",
    url: "https://doi.org/10.1021/acsaom.3c00216",
  },
  {
    label: "DLR 2022",
    detail: "Beneitez Ortega, thermal management of stratospheric HALE avionics",
    url: "https://elib.dlr.de/187412/",
  },
  {
    label: "Beihang 2023",
    detail: "Fu et al., Adv. Space Res. 72, 541 · flight-tested cooling film",
    url: "https://doi.org/10.1016/j.asr.2023.03.004",
  },
];

export default function Home({
  meta,
  onOpenSimulator,
}: {
  meta: Meta | null;
  onOpenSimulator: () => void;
}) {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-zinc-200 py-16 md:py-24">
        <Kicker>Conrad Challenge · Project STRATOVANE</Kicker>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-950 md:text-5xl">
          Electronics boxes that cool themselves
          <span className="text-zinc-400">. No power, no pumps, no added weight.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600">
          At 20 km the air is too thin for fans, and the sun cooks an aircraft&apos;s avionics from
          the outside while the electronics cook it from the inside. STRATOVANE treats the aluminum
          enclosure itself with anodic porous alumina, a microscopic texture grown from the metal
          that bounces sunlight away and radiates absorbed heat straight through the infrared
          atmosphere window into space.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenSimulator}
            className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Open the live simulator
          </button>
          <span className="text-xs text-zinc-400">
            Python heat-balance model · every assumption labelled · nothing to install
          </span>
        </div>

        {/* Verified anchors */}
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-zinc-100 pt-10 md:grid-cols-4">
          <Stat
            label="Ambient at 20 km"
            value="−56.5"
            unit="°C"
            hint="U.S. Standard Atmosphere 1976, checked against the model"
          />
          <Stat
            label="Unmitigated avionics can reach"
            value="≈ +190"
            unit="°C"
            hint="DLR 2022 prediction for a bare anodized enclosure: the problem we attack"
          />
          <Stat
            label="AAO optical target"
            value="α 0.10 / ε 0.95"
            hint="Solar absorptance / IR emissivity, Díaz-Lobo et al. 2024"
          />
          <Stat
            label="Extra power to run it"
            value="0"
            unit="W"
            hint="The coating is the structure: heat leaves as radiation"
          />
        </div>
      </section>

      {/* Three columns: problem / idea / evidence */}
      <section className="grid gap-10 py-14 md:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-950">
            01 · The problem
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Stratospheric HALE aircraft fly twice as high as passenger jets for weeks at a time.
            Thin air means fans barely work and convection is weak yet fickle: it can dominate the
            heat budget and it can also vanish at night. Unmitigated boxes are predicted to reach
            about +190 °C, far beyond electronics limits, while cold nights can pull the same box
            below 0 °C. Both ends must be controlled.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-950">
            02 · The idea
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Anodize the enclosure to grow a 12 µm layer of porous alumina: solar reflectance ~90%,
            infrared emissivity ~95% in the 8-13 µm atmospheric window. The surface is grown, not
            glued: no film to delaminate, no paint to age, roughly 17 g/m² net mass gain, zero
            operating power. It is the same physics that lets a surface dump heat to the cold of
            space.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-950">
            03 · The evidence
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Every number on this site traces to a source. The optical constants come from a peer-
            reviewed CSIC study; the +190 °C problem statement comes from DLR&apos;s own thermal
            model; the strongest competing film was flight-tested in 2023. Our independent audit
            tracked 35 claims: 23 verified, 13 corrections applied, and anything unverifiable is
            labelled as such rather than quietly kept.
          </p>
        </div>
      </section>

      {/* Honesty strip */}
      <section className="rounded-lg border border-amber-200 bg-amber-50/60 px-5 py-4">
        <h3 className="text-sm font-semibold text-amber-900">Read before judging</h3>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
          This is a preliminary engineering model, not flight-proven hardware. Convection at
          altitude is an assumed input and is the single biggest lever in the results; the
          simulator shows its value alongside every answer. Scenario heat loads are assumptions,
          not measurements. {meta ? `Model v${meta.version}, built ${meta.date}.` : ""}
        </p>
      </section>

      {/* Sources */}
      <section className="py-14">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Primary sources
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SOURCES.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-zinc-200 px-4 py-4 transition-colors hover:border-zinc-400"
            >
              <p className="text-sm font-semibold text-zinc-950 group-hover:text-orange-700">
                {s.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.detail}</p>
              <p className="mt-2 font-mono text-[11px] text-zinc-400 group-hover:text-zinc-600">
                {s.url.replace("https://", "")}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
