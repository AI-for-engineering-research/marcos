// src/lib/uncertainty-cube.ts
//
// Loader and min/max reducer for the pyEPM uncertainty cube produced by
// `pyepm-sweep-cube` (pyepm/commands/sweep_cube.py in the pyEPM repo).
//
// This is deliberately separate from sweep-data.ts, which serves /sensitivity.
// That cube is a TIME SERIES at an interpolated 4-D point; this one is a final
// state over a 6-D factorial, reduced by min/max. Different data, different
// reduction, different question -- sharing a module would mean one file whose
// every function takes a flag.
//
// Nothing here hardcodes the axis names or how many there are. The shape comes
// from `manifest.shape_order`, so a seventh swept parameter is a re-gather and
// a new chip row, not a code change.

import { withBasePath } from "@/lib/base-path";

export type AxisBaseline = {
  value: number | null;
  index: number | null;
  reason?: string;
};

export type Coverage = {
  n_cases: number;
  n_present: number;
  n_missing: number;
  complete: boolean;
  missing_case_paths: string[];
  missing_case_ids: number[];
  missing_truncated: boolean;
};

export type CubeManifest = {
  format: string;
  generated_utc: string;
  binary_file: string;
  dtype: string;
  shape_order: string[]; // ["variable", <outer axis>, ...the rest]
  shape: number[];
  n_bytes_expected: number;
  variables: string[];
  variable_units: Record<string, string>;
  final_time_s: number;
  axes: Record<string, number[]>;
  axis_scaling_hint: Record<string, "log" | "linear">;
  axis_keys: Record<string, string>;
  axis_baseline: Record<string, AxisBaseline>;
  decomposition: {
    partition: { total: string; terms: string[]; note: string };
    subsets: Record<
      string,
      { of: string; terms: string[]; note: string }
    >;
  };
  decomposition_max_relative_residual: number;
  source_campaign: {
    name: string;
    array_job_id: string;
    n_cases: number;
    pyepm_git_sha: string;
    pyepm_git_dirty: boolean;
    base_input_sha256: string;
    submitted_utc: string;
  };
  coverage: Coverage;
  notes: string[];
};

export type CubeData = {
  manifest: CubeManifest;
  cube: Float32Array;
  /** Axis names in cube order, excluding the leading variable axis. */
  axisNames: string[];
  /** Element strides for every axis of `shape`, including the variable axis. */
  strides: number[];
  varIndex: Map<string, number>;
};

export async function loadCube(): Promise<CubeData> {
  const [manifestRes, binRes] = await Promise.all([
    fetch(withBasePath("/data/uncertainty_v1.json"), { cache: "force-cache" }),
    fetch(withBasePath("/data/uncertainty_v1.bin"), { cache: "force-cache" }),
  ]);
  if (!manifestRes.ok) {
    throw new Error(`Failed to load cube manifest (${manifestRes.status})`);
  }
  if (!binRes.ok) {
    throw new Error(`Failed to load cube binary (${binRes.status})`);
  }

  const manifest = (await manifestRes.json()) as CubeManifest;
  const buf = await binRes.arrayBuffer();

  if (manifest.dtype !== "float32") {
    throw new Error(`Unsupported dtype: ${manifest.dtype}`);
  }
  // A truncated or stale binary would otherwise reduce to a plausible-looking
  // band over whatever happened to be in the buffer.
  if (buf.byteLength !== manifest.n_bytes_expected) {
    throw new Error(
      `Cube size mismatch: got ${buf.byteLength} bytes, manifest expects ${manifest.n_bytes_expected}`,
    );
  }

  const strides = new Array(manifest.shape.length).fill(1);
  for (let i = manifest.shape.length - 2; i >= 0; i--) {
    strides[i] = strides[i + 1] * manifest.shape[i + 1];
  }

  const varIndex = new Map<string, number>();
  manifest.variables.forEach((name, i) => varIndex.set(name, i));

  return {
    manifest,
    cube: new Float32Array(buf),
    axisNames: manifest.shape_order.slice(1),
    strides,
    varIndex,
  };
}

/** Selected value indices per axis, e.g. { alpha_C: [0, 1], FSC: [4] }. */
export type Selection = Record<string, number[]>;

export type BandPoint = {
  x: number;
  min: number;
  max: number;
  /** Recharts stacks an Area on a base, so the band is drawn as [min, span]. */
  span: number;
  nominal: number | null;
  /** Cells actually reduced over, and how many of those were NaN. */
  n: number;
  nMissing: number;
};

/**
 * Min/max of `varName` over the selected cross-product, at every value of the
 * outer axis.
 *
 * The band is a RANGE, not a percentile interval: the grid is uniformly spaced
 * with no argued prior over it, so any inner quantile would imply a rigour the
 * design does not have. Callers must label it accordingly.
 *
 * NaN cells (a campaign still being backfilled) are skipped rather than
 * poisoning the reduction, and counted so the caller can say so.
 */
export function reduceBand(
  data: CubeData,
  varName: string,
  selection: Selection,
): BandPoint[] {
  const v = data.varIndex.get(varName);
  if (v === undefined) throw new Error(`Unknown variable: ${varName}`);

  const { manifest, cube, axisNames, strides } = data;
  const outerName = axisNames[0];
  const outerValues = manifest.axes[outerName];
  const innerNames = axisNames.slice(1);

  // Index lists to iterate for each nuisance axis, defaulting to "all
  // selected" so an axis the caller forgot cannot silently collapse the band.
  const innerChoices = innerNames.map((name) => {
    const chosen = selection[name];
    return chosen && chosen.length > 0
      ? chosen
      : manifest.axes[name].map((_, i) => i);
  });

  // Offsets of every selected nuisance combination, relative to one (variable,
  // outer) cell. Built once and reused across the outer axis: with 5 nuisance
  // axes and everything selected this is 1,260 offsets, recomputed 15 times
  // otherwise for no reason.
  let offsets: number[] = [0];
  innerNames.forEach((name, i) => {
    const stride = strides[axisNames.indexOf(name) + 1];
    const next: number[] = [];
    for (const base of offsets) {
      for (const index of innerChoices[i]) next.push(base + index * stride);
    }
    offsets = next;
  });

  // The all-defaults cell, when every axis's baseline is on the grid. Read
  // rather than interpolated: it is a real member of the factorial.
  let nominalOffset: number | null = 0;
  for (const name of innerNames) {
    const baseline = manifest.axis_baseline?.[name];
    if (!baseline || baseline.index === null) {
      nominalOffset = null;
      break;
    }
    nominalOffset += baseline.index * strides[axisNames.indexOf(name) + 1];
  }

  const varBase = v * strides[0];
  const outerStride = strides[1];

  return outerValues.map((x, outerIndex) => {
    const base = varBase + outerIndex * outerStride;
    let min = Infinity;
    let max = -Infinity;
    let nMissing = 0;
    for (const offset of offsets) {
      const value = cube[base + offset];
      if (!Number.isFinite(value)) {
        nMissing++;
        continue;
      }
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const empty = min === Infinity;
    const nominalRaw =
      nominalOffset === null ? NaN : cube[base + nominalOffset];

    return {
      x,
      min: empty ? NaN : min,
      max: empty ? NaN : max,
      span: empty ? NaN : max - min,
      nominal: Number.isFinite(nominalRaw) ? nominalRaw : null,
      n: offsets.length,
      nMissing,
    };
  });
}

/** How many cells the current selection reduces over, per outer-axis value. */
export function selectionSize(data: CubeData, selection: Selection): number {
  return data.axisNames.slice(1).reduce((acc, name) => {
    const chosen = selection[name];
    const n =
      chosen && chosen.length > 0
        ? chosen.length
        : data.manifest.axes[name].length;
    return acc * n;
  }, 1);
}
