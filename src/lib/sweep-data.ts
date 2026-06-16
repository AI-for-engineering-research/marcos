// src/lib/sweep-data.ts
//
// Client-side loader and multilinear interpolator for the precomputed pyEPM
// 4D sensitivity cube produced by `pyepm-sweep4d` (see pyepm/commands/sweep4d.py
// in the pyEPM repo).
//
// Layout: Float32, C-order, shape [V, F, S, T, N, K]
//   V = variables (see manifest.variables)
//   F = FSC axis              (interpolated in log10)
//   S = EI_soot axis          (interpolated in log10)
//   T = T_amb axis            (interpolated linearly)
//   N = N0 axis               (interpolated linearly)
//   K = subsampled time axis  (snap-to-nearest is fine; series read whole)
//
// Stride for index (v, f, s, t, n, k):
//   offset = ((((v * F + f) * S + s) * T + t) * N + n) * K + k

import { withBasePath } from "@/lib/base-path";

export type FrozenParameters = {
  engine_exit: { Tc0_K: number; Ab0_m2: number };
  ambient: {
    pressure_Pa: number;
    RHi_init: number;
    background_SO4_mole_fraction: number;
    ambient_aerosol_per_cm3: number;
  };
  emissions: {
    SO2_to_SO4_fraction: number;
    EI_H2O_kg_per_kg_fuel: number;
    EI_ions_per_kg_fuel: number;
    sulfur_vPM_per_kg_fuel: number;
  };
  aerosols: {
    soot_GMD_m: number;
    soot_GSD: number;
    soot_kappa: number;
    ambient_GMD_m: number;
    ambient_GSD: number;
    ambient_kappa: number;
    sulfur_GSD: number;
    sulfur_kappa: number;
  };
  simulation: {
    t_initial_s: number;
    t_final_s: number;
    t_steps_native: number;
  };
};

export type SweepManifest = {
  format: string;
  sweep_label: string;
  generated_utc: string;
  pyepm_git_sha: string;
  pyepm_git_dirty: boolean;
  input_yaml_path: string;
  input_yaml_sha256: string;
  binary_file: string;
  dtype: string;
  byte_order: string;
  shape_order: string[];
  shape: [number, number, number, number, number, number];
  n_bytes_expected: number;
  variables: string[];
  variable_units: Record<string, string>;
  axes: {
    fsc_ppm: number[];
    soot_per_kgfuel: number[];
    temperature_amb_K: number[];
    n0_kg_air_per_kg_fuel: number[];
    time_s: number[];
  };
  axis_scaling_hint: Record<string, "log" | "linear">;
  interpolation_recommended: string;
  frozen_parameters: FrozenParameters;
  notes: string[];
};

export type SweepData = {
  manifest: SweepManifest;
  cube: Float32Array;
  varIndex: Map<string, number>;
};

export async function loadSweep(): Promise<SweepData> {
  const manifestUrl = withBasePath("/data/sweep_v1.json");
  const binUrl = withBasePath("/data/sweep_v1.bin");

  const [manifestRes, binRes] = await Promise.all([
    fetch(manifestUrl, { cache: "force-cache" }),
    fetch(binUrl, { cache: "force-cache" }),
  ]);
  if (!manifestRes.ok) {
    throw new Error(`Failed to load sweep manifest (${manifestRes.status})`);
  }
  if (!binRes.ok) {
    throw new Error(`Failed to load sweep binary (${binRes.status})`);
  }

  const manifest = (await manifestRes.json()) as SweepManifest;
  const buf = await binRes.arrayBuffer();

  if (manifest.dtype !== "float32") {
    throw new Error(`Unsupported dtype: ${manifest.dtype}`);
  }
  if (buf.byteLength !== manifest.n_bytes_expected) {
    throw new Error(
      `Sweep binary size mismatch: got ${buf.byteLength}, expected ${manifest.n_bytes_expected}`,
    );
  }

  const cube = new Float32Array(buf);
  const varIndex = new Map<string, number>();
  manifest.variables.forEach((name, i) => varIndex.set(name, i));

  return { manifest, cube, varIndex };
}

// ---------------------------------------------------------------------------
// Bracket / fractional index along an axis.
// ---------------------------------------------------------------------------
//
// Returns [i0, i1, w] such that the interpolated value is
//   (1 - w) * a[i0] + w * a[i1]
// with i0 <= i1 and 0 <= w <= 1.
//
// The transform `t` is applied to both `axis` and `value` so that interpolation
// happens in the chosen space (linear or log10).

type Transform = (x: number) => number;
const identity: Transform = (x) => x;
const log10: Transform = (x) => Math.log10(x);

export function bracket(
  axis: number[],
  value: number,
  transform: Transform = identity,
): { i0: number; i1: number; w: number } {
  const n = axis.length;
  if (n === 0) throw new Error("bracket: empty axis");
  if (n === 1) return { i0: 0, i1: 0, w: 0 };

  const tv = transform(value);
  const ta0 = transform(axis[0]);
  const taN = transform(axis[n - 1]);

  // Clamp to grid extent.
  if (tv <= ta0) return { i0: 0, i1: 0, w: 0 };
  if (tv >= taN) return { i0: n - 1, i1: n - 1, w: 0 };

  // Linear scan is fine for n <= ~10.
  for (let i = 0; i < n - 1; i++) {
    const tlo = transform(axis[i]);
    const thi = transform(axis[i + 1]);
    if (tv >= tlo && tv <= thi) {
      const w = thi === tlo ? 0 : (tv - tlo) / (thi - tlo);
      return { i0: i, i1: i + 1, w };
    }
  }
  return { i0: n - 1, i1: n - 1, w: 0 };
}

export function snapNearest(
  axis: number[],
  value: number,
  transform: Transform = identity,
): number {
  let best = 0;
  let bestD = Infinity;
  const tv = transform(value);
  for (let i = 0; i < axis.length; i++) {
    const d = Math.abs(transform(axis[i]) - tv);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Time-series extraction.
// ---------------------------------------------------------------------------

export type SliderState = {
  fsc: number;
  soot: number;
  tAmb: number;
  n0: number;
};

export type Mode = "interp" | "snap";

/** Strides for [V, F, S, T, N, K] in elements (not bytes). */
function strides(shape: number[]): number[] {
  const out = new Array(shape.length).fill(1);
  for (let i = shape.length - 2; i >= 0; i--) {
    out[i] = out[i + 1] * shape[i + 1];
  }
  return out;
}

/**
 * Extract a single time series for variable `varName` at the slider point.
 *
 * In "interp" mode we trilinearly... no, *quadrilinearly* interpolate
 * across the four parameter axes (in their natural space, log for FSC and
 * EI_soot, linear for T_amb and N0). The time axis itself is taken whole —
 * we never interpolate between time steps, because the dashboard plots are
 * full time series.
 *
 * In "snap" mode we pick the nearest grid node in each axis (no interpolation).
 */
export function timeSeries(
  data: SweepData,
  varName: string,
  sliders: SliderState,
  mode: Mode,
): Float32Array {
  const v = data.varIndex.get(varName);
  if (v === undefined) throw new Error(`Unknown variable: ${varName}`);

  const { manifest, cube } = data;
  const [_V, F, S, T, N, K] = manifest.shape;
  void _V;
  const st = strides([_V, F, S, T, N, K]); // [stV, stF, stS, stT, stN, stK]

  const baseV = v * st[0];

  const ax = manifest.axes;

  if (mode === "snap") {
    const iF = snapNearest(ax.fsc_ppm, sliders.fsc, log10);
    const iS = snapNearest(ax.soot_per_kgfuel, sliders.soot, log10);
    const iT = snapNearest(ax.temperature_amb_K, sliders.tAmb);
    const iN = snapNearest(ax.n0_kg_air_per_kg_fuel, sliders.n0);
    const off = baseV + iF * st[1] + iS * st[2] + iT * st[3] + iN * st[4];
    return cube.slice(off, off + K);
  }

  // Interpolated mode.
  const bF = bracket(ax.fsc_ppm, sliders.fsc, log10);
  const bS = bracket(ax.soot_per_kgfuel, sliders.soot, log10);
  const bT = bracket(ax.temperature_amb_K, sliders.tAmb);
  const bN = bracket(ax.n0_kg_air_per_kg_fuel, sliders.n0);

  const out = new Float32Array(K);
  // 16 corners of the 4D hypercube.
  for (let cF = 0; cF < 2; cF++) {
    const iF = cF === 0 ? bF.i0 : bF.i1;
    const wF = cF === 0 ? 1 - bF.w : bF.w;
    if (wF === 0 && cF === 1) continue;
    for (let cS = 0; cS < 2; cS++) {
      const iS = cS === 0 ? bS.i0 : bS.i1;
      const wS = cS === 0 ? 1 - bS.w : bS.w;
      if (wS === 0 && cS === 1) continue;
      for (let cT = 0; cT < 2; cT++) {
        const iT = cT === 0 ? bT.i0 : bT.i1;
        const wT = cT === 0 ? 1 - bT.w : bT.w;
        if (wT === 0 && cT === 1) continue;
        for (let cN = 0; cN < 2; cN++) {
          const iN = cN === 0 ? bN.i0 : bN.i1;
          const wN = cN === 0 ? 1 - bN.w : bN.w;
          if (wN === 0 && cN === 1) continue;
          const w = wF * wS * wT * wN;
          if (w === 0) continue;
          const off = baseV + iF * st[1] + iS * st[2] + iT * st[3] + iN * st[4];
          for (let k = 0; k < K; k++) {
            out[k] += w * cube[off + k];
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Saturation curves (ported verbatim from pyepm/thermo/__init__.py).
// Keep formulas identical to ensure mixing-line plot matches the Python
// `mixingLine()` reference figure.
// pyepm/thermo/__init__.py:72  pSat_H2Ol
// pyepm/thermo/__init__.py:110 pSat_H2Os
// ---------------------------------------------------------------------------

export function pSatH2OlPa(T: number): number {
  return (
    100.0 *
    Math.exp(
      -6096.9385 / T +
        16.635794 -
        0.02711193 * T +
        1.673952e-5 * T * T +
        2.433502 * Math.log(T),
    )
  );
}

export function pSatH2OsPa(T: number): number {
  return (
    100.0 *
    Math.exp(
      -6024.5282 / T +
        24.7219 +
        0.010613868 * T -
        1.3198825e-5 * T * T -
        0.49382577 * Math.log(T),
    )
  );
}
