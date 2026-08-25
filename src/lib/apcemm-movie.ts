// src/lib/apcemm-movie.ts
//
// Loader and decoder for the APCEMM IWC dispersion movie payload produced by
// `pyepm-comet-movie` (pyepm/comet/movie.py in the pyEPM repo), cut down to
// every other soot level by `pyepm-comet-movie-subset`.
//
// The payload is one manifest, one float32 scalars binary, and one gzipped
// uint8 raster per soot level. A raster holds every panel and every frame of
// that level: (rhi, fsc, frame, y, x) in C order, so one panel-frame is a
// contiguous ny*nx slice and drawing it never has to stride.
//
// **The rasters are quantized, not stored as physical values.** Code 0 means
// "at or below the storage floor" -- no ice -- and codes 1..255 are log-spaced
// over floor..ceiling. Everything here that turns a code into a number or a
// colour goes through a 256-entry table built once from the manifest, because
// the alternative is a pow() per pixel per frame across ten panels.

import { withBasePath } from "@/lib/base-path";

export type MovieManifest = {
  format: string;
  generated_utc: string;
  t_amb_k: number;
  axes: {
    rhi_percent: number[];
    fsc_ppm: number[];
    soot_ei_per_kg: number[];
    time_hours: number[];
  };
  window: {
    x_min_m: number;
    x_max_m: number;
    y_min_m: number;
    y_max_m: number;
    nx: number;
    ny: number;
  };
  window_note: string;
  measured_ice_bounds: {
    x_min_m: number;
    x_max_m: number;
    y_min_m: number;
    y_max_m: number;
  } | null;
  max_clipped_ice_fraction: number;
  quantization: {
    floor_kg_m3: number;
    display_floor_kg_m3: number;
    ceiling_kg_m3: number;
    n_levels: number;
    relative_step: number;
    decode: string;
  };
  rasters: {
    files: Record<string, string>;
    bytes: Record<string, number>;
    layout: string[];
    shape: number[]; // [rhi, fsc, frame, y, x]
    dtype: string;
    encoding: string;
  };
  scalars: {
    file: string;
    layout: string[];
    shape: number[]; // [rhi, fsc, soot, frame, scalar]
    dtype: string;
    names: string[];
    units: Record<string, string>;
    nan_means: string;
  };
  cases: Record<string, CaseInfo>;
  status_meaning: Record<string, string>;
  source_campaigns: Record<string, string>;
  cap_hours: number;
  frame_interval_minutes: number;
  caveats: string[];
  soot_subset?: {
    source_indices: number[];
    source_count: number;
    note: string;
  };
};

export type CaseInfo = {
  /** Frames this case actually has. Beyond it the contrail is gone. */
  n_frames: number;
  /** "Complete" = dissipated before the cap; "Incomplete" = right-censored. */
  status: string;
  dissipated_hours: number | null;
};

export const STATUS_DISSIPATED = "Complete";
export const STATUS_CENSORED = "Incomplete";

const MANIFEST_URL = "/data/apcemm/manifest.json";
const DATA_DIR = "/data/apcemm";

export async function loadMovieManifest(): Promise<MovieManifest> {
  // Same caching split as the uncertainty cube: the manifest is revalidated on
  // every visit, and the binaries it names are then keyed by its generation
  // stamp. Both keep their URLs across a re-export, so caching the binaries by
  // URL alone would serve a returning visitor last month's payload forever.
  const res = await fetch(withBasePath(MANIFEST_URL), { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load the movie manifest (${res.status})`);
  }
  const manifest = (await res.json()) as MovieManifest;
  if (!manifest.format?.startsWith("pyepm-apcemm-movie/")) {
    throw new Error(`Unexpected payload format: ${manifest.format}`);
  }
  return manifest;
}

function versioned(manifest: MovieManifest, file: string): string {
  return `${withBasePath(`${DATA_DIR}/${file}`)}?v=${encodeURIComponent(
    manifest.generated_utc,
  )}`;
}

export async function loadScalars(
  manifest: MovieManifest,
): Promise<Float32Array> {
  const res = await fetch(versioned(manifest, manifest.scalars.file), {
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(`Failed to load the movie scalars (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  const expected = manifest.scalars.shape.reduce((a, b) => a * b, 1) * 4;
  // A truncated read would otherwise render as a panel of plausible numbers.
  if (buf.byteLength !== expected) {
    throw new Error(
      `Scalars size mismatch: got ${buf.byteLength} bytes, expected ${expected}`,
    );
  }
  return new Float32Array(buf);
}

/**
 * One soot level's rasters, gunzipped in the browser.
 *
 * The files are gzip rather than PNG so the bytes come back exactly as
 * exported -- a PNG round-trip would go through the browser's colour
 * management, and these are physical codes, not pixels. GitHub Pages will not
 * negotiate Content-Encoding for a `.gz` asset, so the decompression is ours to
 * do: `DecompressionStream` (Chrome 80+, Safari 16.4+, Firefox 113+).
 */
export async function loadSootRasters(
  manifest: MovieManifest,
  sootIndex: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const file = manifest.rasters.files[String(sootIndex)];
  if (!file) {
    throw new Error(`No raster for soot index ${sootIndex}`);
  }
  const res = await fetch(versioned(manifest, file), {
    cache: "force-cache",
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to load ${file} (${res.status})`);
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "This browser cannot decompress the rasters (DecompressionStream is " +
        "unavailable). Chrome 80+, Safari 16.4+ or Firefox 113+ can.",
    );
  }
  const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  const expected = manifest.rasters.shape.reduce((a, b) => a * b, 1);
  if (buf.byteLength !== expected) {
    throw new Error(
      `${file} decompressed to ${buf.byteLength} bytes, expected ${expected}`,
    );
  }
  return new Uint8Array(buf);
}

/** IWC in kg/m^3 for every code, so decoding a pixel is a lookup. */
export function decodeTable(manifest: MovieManifest): Float32Array {
  const { floor_kg_m3: floor, ceiling_kg_m3: ceiling, n_levels: levels } =
    manifest.quantization;
  const table = new Float32Array(256);
  for (let code = 1; code <= levels; code++) {
    table[code] = floor * Math.pow(ceiling / floor, (code - 1) / (levels - 1));
  }
  return table; // table[0] stays 0: no ice, not "the least ice we can show".
}

/** Element offset of one panel-frame's first pixel in a soot level's raster. */
export function frameOffset(
  manifest: MovieManifest,
  rhiIndex: number,
  fscIndex: number,
  frame: number,
): number {
  const [, nFsc, nFrames, ny, nx] = manifest.rasters.shape;
  return (((rhiIndex * nFsc + fscIndex) * nFrames + frame) * ny + 0) * nx;
}

/** One panel-frame's six scalars, or null where the contrail has dissipated. */
export function frameScalars(
  manifest: MovieManifest,
  scalars: Float32Array,
  rhiIndex: number,
  fscIndex: number,
  sootIndex: number,
  frame: number,
): Record<string, number> | null {
  const [, nFsc, nSoot, nFrames, nScalar] = manifest.scalars.shape;
  const base =
    ((((rhiIndex * nFsc + fscIndex) * nSoot + sootIndex) * nFrames + frame) *
      nScalar);
  const out: Record<string, number> = {};
  let anyFinite = false;
  manifest.scalars.names.forEach((name, i) => {
    const value = scalars[base + i];
    out[name] = value;
    if (Number.isFinite(value)) anyFinite = true;
  });
  return anyFinite ? out : null;
}

export function caseKey(
  manifest: MovieManifest,
  rhiIndex: number,
  fscIndex: number,
  sootIndex: number,
): string {
  return `${manifest.axes.rhi_percent[rhiIndex]}|${manifest.axes.fsc_ppm[fscIndex]}|${sootIndex}`;
}

export function caseInfo(
  manifest: MovieManifest,
  rhiIndex: number,
  fscIndex: number,
  sootIndex: number,
): CaseInfo | undefined {
  return manifest.cases[caseKey(manifest, rhiIndex, fscIndex, sootIndex)];
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
// Magnitude, so the ramp is monotonic in lightness: pale at the contrail's
// edge, near-black in its core. It is multi-hue (reversed magma) rather than
// one hue, because a single hue has only lightness to spend and the interior
// of a contrail is where all the structure is -- with one hue the core reads
// as a solid blob.
//
// **Not a diverging map.** Diverging encodes which side of a baseline a value
// falls on, and IWC has no baseline: its midpoint would have to be an
// arbitrary IWC, which a reader would then take for a meaningful threshold.
//
// The scale is LOG in IWC and starts at the manifest's display floor, not its
// storage floor. Those are deliberately different: the storage floor sits a
// decade lower so area-averaging at the contrail's edge cannot push mass out
// of the payload irrecoverably, but drawing from there would paint a halo of
// optically irrelevant haze.

const MAGMA_RAMP = [
  "#fcfdbf", "#fed395", "#fea973", "#fa7d5e", "#e95462", "#c83e73",
  "#a3307e", "#7e2482", "#59157e", "#331067", "#120d31", "#000004",
];

// Log alone is not enough. Measured over the payload: 80% of a frame's ice
// mass sits between 0.7 and 0.9 of the way up a 1e-9..6e-6 log scale, so the
// bottom half of the ramp draws almost nothing but the faint rim and the
// interior gets a fifth of the colours. Raising the floor would fix the
// contrast by hiding the outer sheet -- including cells the radiative stage
// still counts, its threshold being 3e-9 -- so instead the ramp position is
// raised to this power, which spends most of the colours where the ice is
// while still drawing every cell the payload holds. The colour bar places its
// ticks through the same curve, so a label still sits at its true value.
export const SCALE_GAMMA = 3;

/** Background of a cell holding no ice: neutral, so it is never a faint blue. */
export const NO_ICE_RGB: [number, number, number] = [0xf4, 0xf5, 0xf6];

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The ramp sampled at `t` in [0, 1]. Exported so the colourbar matches exactly. */
export function rampColour(t: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t));
  const position = clamped * (MAGMA_RAMP.length - 1);
  const low = Math.floor(position);
  const high = Math.min(MAGMA_RAMP.length - 1, low + 1);
  const f = position - low;
  const a = hexToRgb(MAGMA_RAMP[low]);
  const b = hexToRgb(MAGMA_RAMP[high]);
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/**
 * RGBA for every code, given the colour scale's own floor and ceiling.
 *
 * Codes below `displayFloor` are drawn as no-ice rather than as the palest
 * blue: they carry mass the payload keeps on purpose, but not mass a reader
 * should be asked to see.
 */
export function scalePosition(
  value: number,
  floor: number,
  ceiling: number,
): number {
  const t = (Math.log(value) - Math.log(floor)) / (Math.log(ceiling) - Math.log(floor));
  return Math.pow(Math.min(1, Math.max(0, t)), SCALE_GAMMA);
}

export function colourTable(
  manifest: MovieManifest,
  displayFloor: number,
  displayCeiling: number,
): Uint8ClampedArray {
  const decode = decodeTable(manifest);
  const table = new Uint8ClampedArray(256 * 4);
  for (let code = 0; code < 256; code++) {
    const value = decode[code];
    const rgb =
      value < displayFloor
        ? NO_ICE_RGB
        : rampColour(scalePosition(value, displayFloor, displayCeiling));
    table[code * 4] = rgb[0];
    table[code * 4 + 1] = rgb[1];
    table[code * 4 + 2] = rgb[2];
    table[code * 4 + 3] = 255;
  }
  return table;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "1.5 × 10¹³", for axis chips and readouts. */
export function formatSci(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const digitsOf = (n: number) =>
    String(Math.abs(n))
      .split("")
      .map((d) => superscripts[Number(d)])
      .join("");
  const sign = exponent < 0 ? "⁻" : "";
  const mantissaText = mantissa.toFixed(digits).replace(/\.?0+$/, "");
  return `${mantissaText} × 10${sign}${digitsOf(exponent)}`;
}

/** Frame index as clock time from the start of the APCEMM run. */
export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}:${String(minutes).padStart(2, "0")} h`;
}
