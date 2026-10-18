/** Typed client for the STRATOVANE physics API (proxied via /api/sim). */

export type MaterialInfo = {
  id: string;
  name: string;
  alpha: number;
  epsilon: number;
  status: string;
};

export type Meta = {
  version: string;
  commit: string;
  date: string;
  limitations: string[];
  ranges: Record<string, [number, number]>;
  materials: MaterialInfo[];
  defaults: { altitude: number; wind: number; heat_load: number; solar_scale: number };
};

export type AltitudeResult = {
  t_electronics: number;
  t_surface: number;
  t_wall: number;
  q_env: { rad: number; conv: number; solar: number };
  residual: number;
  h_conv: number;
  mass_al_kg: number;
  mass_aao_kg: number;
};

export type Scenario = {
  altitude_m: number;
  t_air_c: number;
  t_sky_c: number;
  pressure_ratio: number;
  density_ratio: number;
  wind: number;
  heat: number;
  solar_scale: number;
};

export type AltitudeResponse = {
  results: Record<string, AltitudeResult>;
  scenario: Scenario;
  metadata: { solar_scale_applied: boolean };
};

export type SweepResponse = {
  results: Record<string, { alt_km: number[]; t_electronics: number[]; t_surface: number[] }>;
  t_air_profile: { alt_km: number; t_air_c: number }[];
};

export type TransientResponse = {
  results: Record<
    string,
    {
      time: number[];
      t_electronics: number[];
      t_wall: number[];
      t_air_c: number;
      metrics: { min: number; max: number; swing: number; overcool_risk: boolean; overheat_above_50: boolean };
    }
  >;
  metadata: { t_air_c: number };
};

export type SpectralResponse = {
  results: Record<
    string,
    {
      solar: { wavelength: number[]; reflectance: number[] };
      thermal: { wavelength: number[]; emissivity: number[] };
    }
  >;
  window: [number, number];
};

export type MCResponse = {
  mean: number;
  median: number;
  p5: number;
  p95: number;
  std: number;
  histogram: number[];
};

export type SensitivityResponse = { tornado: [string, number][]; next_experiment: string };

export type BenchmarkResponse = {
  reported: { deltaT_C: number; peak_cooling_W_m2: number };
  modeled: {
    T_AAO_C: number;
    T_bare_C: number;
    deltaT_contrast_C: number;
    deltaT_subambient_AAO_C: number;
    peak_cooling_at_ambient_W_m2: number;
    wind_sweep: Record<string, { T_AAO_C: number; T_bare_C: number }>;
  };
  discrepancy: Record<string, number>;
  notes: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials?: string;
  grade?: string;
  school?: string;
  focus?: string;
  links: { label?: string; url?: string }[];
  placeholder?: boolean;
};

export type Mentor = {
  name: string;
  role: string;
  initials?: string;
  detail?: string;
};

export type TeamData = {
  project: string;
  tagline: string;
  mentor?: Mentor | null;
  members: TeamMember[];
  advisors?: { name: string; role: string }[];
  anchors: { label: string; detail: string; url: string }[];
  note?: string;
};

export type ActivityEntry = { date: string; tag: string; title: string; detail: string };

export type ActivityData = { updated: string; entries: ActivityEntry[]; note?: string };

export class ApiError extends Error {}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(`Physics service returned non-JSON (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(msg);
  }
  return data as T;
}

export const api = {
  meta: () => fetch("/api/sim/meta", { cache: "no-store" }).then((r) => handle<Meta>(r)),

  altitude: (body: {
    materials: string[];
    altitude: number;
    wind: number;
    heat_load: number;
    solar_scale: number;
  }) =>
    fetch("/api/sim/altitude", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<AltitudeResponse>(r)),

  sweep: (body: { materials: string[]; wind: number; heat_load: number }) =>
    fetch("/api/sim/sweep", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<SweepResponse>(r)),

  transient: (body: { materials: string[]; altitude: number; wind: number; heat_load: number }) =>
    fetch("/api/sim/transient", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<TransientResponse>(r)),

  spectral: (body: { materials: string[] }) =>
    fetch("/api/sim/spectral", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<SpectralResponse>(r)),

  montecarlo: (body: { material: string; altitude: number; n: number; seed: number }) =>
    fetch("/api/sim/montecarlo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<{ job_id: string }>(r)),

  job: (id: string) =>
    fetch(`/api/sim/jobs/${id}`, { cache: "no-store" }).then((r) =>
      handle<{ status: string; result?: MCResponse; error?: string }>(r)
    ),

  sensitivity: (body: { material: string; altitude: number }) =>
    fetch("/api/sim/sensitivity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<SensitivityResponse>(r)),

  benchmark: () =>
    fetch("/api/sim/benchmark", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).then((r) => handle<BenchmarkResponse>(r)),

  experimentExample: () =>
    fetch("/api/sim/experiment/example", { cache: "no-store" }).then((r) =>
      handle<{ metrics: { rmse: number; bias: number; n: number; data_source?: string } }>(r)
    ),

  experimentUpload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/sim/experiment", { method: "POST", body: form }).then((r) =>
      handle<{ metrics: { rmse: number; bias: number; n: number } }>(r)
    );
  },

  team: () => fetch("/api/sim/team", { cache: "no-store" }).then((r) => handle<TeamData>(r)),

  activity: () =>
    fetch("/api/sim/activity", { cache: "no-store" }).then((r) => handle<ActivityData>(r)),
};

/** Muted, colorblind-friendly series colors (no neon, no gradients). */
export const MATERIAL_COLORS: Record<string, string> = {
  STRATOVANE_AAO_LITERATURE: "#ea580c",
  AAO_AL_DIAZ_LOBO: "#f97316",
  STRATOVANE_AAO_MEASURED: "#fb923c",
  BARE_ALUMINUM_OXIDIZED: "#3f3f46",
  BARE_ALUMINUM_POLISHED: "#a1a1aa",
  BARE_ALUMINUM_ROUGH: "#52525b",
  ANODIZED_AL_DLR_2022: "#a16207",
  WHITE_REFERENCE_PLACEHOLDER: "#9ca3af",
  AAO_OPTIONAL_RS94: "#059669",
  AAO_OPTIONAL_EPS97: "#0d9488",
};

export const materialColor = (id: string) => MATERIAL_COLORS[id] ?? "#71717a";

export const fmt = (v: number, digits = 1) =>
  v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
