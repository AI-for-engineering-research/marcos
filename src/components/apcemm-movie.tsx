"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Section } from "@/components/section";
import {
  type CaseInfo,
  type MovieManifest,
  NO_ICE_RGB,
  STATUS_CENSORED,
  caseInfo,
  colourTable,
  decodeTable,
  formatHours,
  formatSci,
  frameOffset,
  frameScalars,
  loadMovieManifest,
  loadScalars,
  loadSootRasters,
  rampColour,
  scalePosition,
} from "@/lib/apcemm-movie";

// The panels are ten simultaneous views of one experiment, so everything that
// is not the ice itself -- axes, window, colour scale, time -- is shared and
// fixed. A panel that rescaled to its own contents would let a reader compare
// shapes that are not comparable, which is the whole failure mode this payload
// was built to avoid.

const FRAME_RATES = [3, 6, 12] as const;

// Panels are drawn WIDER than their raster's 256 x 96, which flattens them
// toward the window's true 65:1 proportions and is what lets all ten fit on one
// screen. The canvas keeps its own resolution; only the box it is stretched
// into changes, so this is a display choice, not a resampling.
const PANEL_ASPECT = 4.0;
const DEFAULT_SOOT_EI = 1e12; // the soot-poor end, where sulfur decides the outcome

type PanelId = { rhiIndex: number; fscIndex: number };

type Hover = {
  panel: PanelId;
  xKm: number;
  yM: number;
  iwc: number;
  left: number;
  top: number;
};

export function ApcemmMovie() {
  const [manifest, setManifest] = useState<MovieManifest | null>(null);
  const [scalars, setScalars] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sootIndex, setSootIndex] = useState(0);
  const [rasters, setRasters] = useState<Uint8Array | null>(null);
  const [loadingSoot, setLoadingSoot] = useState(false);

  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState<number>(6);
  const [hover, setHover] = useState<Hover | null>(null);

  // Decompressed levels are ~30 MB each, so the cache holds the two a reader
  // is most likely to compare -- the current one and the one just left.
  const cache = useRef(new Map<number, Uint8Array>());
  const canvases = useRef<Array<HTMLCanvasElement | null>>([]);

  // --- payload ------------------------------------------------------------

  useEffect(() => {
    let live = true;
    loadMovieManifest()
      .then(async (loaded) => {
        const values = await loadScalars(loaded);
        if (!live) return;
        setManifest(loaded);
        setScalars(values);
        const soot = loaded.axes.soot_ei_per_kg;
        let nearest = 0;
        soot.forEach((value, i) => {
          if (
            Math.abs(Math.log10(value) - Math.log10(DEFAULT_SOOT_EI)) <
            Math.abs(Math.log10(soot[nearest]) - Math.log10(DEFAULT_SOOT_EI))
          ) {
            nearest = i;
          }
        });
        setSootIndex(nearest);
      })
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!manifest) return;
    const cached = cache.current.get(sootIndex);
    if (cached) {
      setRasters(cached);
      return;
    }
    const controller = new AbortController();
    setLoadingSoot(true);
    loadSootRasters(manifest, sootIndex, controller.signal)
      .then((data) => {
        cache.current.set(sootIndex, data);
        for (const key of cache.current.keys()) {
          if (cache.current.size > 2 && key !== sootIndex) {
            cache.current.delete(key);
          }
        }
        setRasters(data);
        setLoadingSoot(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setLoadingSoot(false);
        setError(err.message);
      });
    return () => controller.abort();
  }, [manifest, sootIndex]);

  // --- playback -----------------------------------------------------------

  const nFrames = manifest?.axes.time_hours.length ?? 0;

  useEffect(() => {
    if (!playing || !rasters || nFrames === 0) return;
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % nFrames),
      1000 / fps,
    );
    return () => window.clearInterval(id);
  }, [playing, rasters, nFrames, fps]);

  // --- drawing ------------------------------------------------------------

  const colours = useMemo(
    () =>
      manifest
        ? colourTable(
            manifest,
            manifest.quantization.display_floor_kg_m3,
            manifest.quantization.ceiling_kg_m3,
          )
        : null,
    [manifest],
  );
  const decode = useMemo(() => (manifest ? decodeTable(manifest) : null), [
    manifest,
  ]);

  const panels = useMemo(() => {
    if (!manifest) return [];
    const out: PanelId[] = [];
    manifest.axes.fsc_ppm.forEach((_, fscIndex) => {
      manifest.axes.rhi_percent.forEach((__, rhiIndex) => {
        out.push({ rhiIndex, fscIndex });
      });
    });
    return out; // row-major: one FSC row at a time, RHi 110 then 120
  }, [manifest]);

  useEffect(() => {
    if (!manifest || !rasters || !colours) return;
    const { nx, ny } = manifest.window;

    panels.forEach((panel, i) => {
      const canvas = canvases.current[i];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const image = ctx.createImageData(nx, ny);
      const base = frameOffset(manifest, panel.rhiIndex, panel.fscIndex, frame);
      for (let row = 0; row < ny; row++) {
        // The raster's row 0 is the BOTTOM of the window (y ascends with the
        // index); a canvas's row 0 is the top. Flipping here rather than at
        // export keeps the payload in physical order.
        const source = base + (ny - 1 - row) * nx;
        const target = row * nx * 4;
        for (let col = 0; col < nx; col++) {
          const code = rasters[source + col] * 4;
          const at = target + col * 4;
          image.data[at] = colours[code];
          image.data[at + 1] = colours[code + 1];
          image.data[at + 2] = colours[code + 2];
          image.data[at + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    });
  }, [manifest, rasters, colours, frame, panels]);

  // --- interaction --------------------------------------------------------

  const onPanelHover = useCallback(
    (panel: PanelId, event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!manifest || !rasters || !decode) return;
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const { nx, ny, x_min_m, x_max_m, y_min_m, y_max_m } = manifest.window;
      const col = Math.min(
        nx - 1,
        Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * nx)),
      );
      const rowFromTop = Math.min(
        ny - 1,
        Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * ny)),
      );
      const row = ny - 1 - rowFromTop;
      const code =
        rasters[
          frameOffset(manifest, panel.rhiIndex, panel.fscIndex, frame) +
            row * nx +
            col
        ];
      setHover({
        panel,
        xKm: (x_min_m + ((col + 0.5) / nx) * (x_max_m - x_min_m)) / 1000,
        yM: y_min_m + ((row + 0.5) / ny) * (y_max_m - y_min_m),
        iwc: decode[code],
        left: event.clientX,
        top: rect.top - 8,
      });
    },
    [manifest, rasters, decode, frame],
  );

  // --- states -------------------------------------------------------------
  //
  // The heading is static prose and renders immediately; only the panels wait
  // on the payload, which is a 0.5 MB scalars fetch plus a 3 MB raster.

  const intro = (
    <Section
      eyebrow="APCEMM"
      title="Where the ice goes, over twenty hours"
      description={
        "Ten APCEMM runs playing at once, each a cross-section of one contrail " +
        "sliced across the flight path. Rows are fuel sulfur content, columns " +
        "are ambient humidity, and one slider sets the soot every panel emits. " +
        "Colour is ice water content, log scale; a panel that empties has " +
        "dissipated."
      }
    />
  );

  if (error) {
    return (
      <div className="flex flex-col">
        {intro}
        <p className="py-8 text-sm text-[var(--muted)]">
          Could not load the dispersion payload: {error}
        </p>
      </div>
    );
  }

  if (!manifest || !scalars) {
    return (
      <div className="flex flex-col">
        {intro}
        <p className="py-8 text-sm text-[var(--muted)]">Loading the payload…</p>
      </div>
    );
  }

  const soot = manifest.axes.soot_ei_per_kg;
  const hours = manifest.axes.time_hours[frame];
  const { x_min_m, x_max_m, y_min_m, y_max_m } = manifest.window;
  const spanKm = (x_max_m - x_min_m) / 1000;
  const spanM = y_max_m - y_min_m;
  const exaggeration = (x_max_m - x_min_m) / (y_max_m - y_min_m) / PANEL_ASPECT;

  return (
    <div className="flex flex-col">
      {intro}

      <div className="border-t px-0 py-7 editorial-rule">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ---------------- controls, left ---------------- */}
          <aside className="lg:w-[17.5rem] lg:shrink-0">
            <div className="flex flex-col gap-3.5 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/60 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((on) => !on)}
                  className="rounded-full border border-[color:var(--accent)] px-4 py-1.5 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--accent-deep)] transition hover:bg-[color:var(--accent)]/10"
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <div className="flex items-center gap-1">
                  {FRAME_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFps(rate)}
                      aria-pressed={fps === rate}
                      className={[
                        "rounded-full border px-2 py-0.5 text-[0.66rem] tabular-nums transition",
                        fps === rate
                          ? "border-[color:var(--accent)] text-[var(--accent-deep)]"
                          : "border-[color:var(--line)] text-[var(--muted)] hover:border-[color:var(--accent)]",
                      ].join(" ")}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-medium tabular-nums tracking-[-0.03em] text-[var(--accent-deep)]">
                    {formatHours(hours)}
                  </span>
                  <span className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted)]">
                    after formation
                  </span>
                </div>
                <label className="block">
                  <span className="sr-only">Time since formation</span>
                  <input
                    type="range"
                    className="slider-lg"
                    min={0}
                    max={nFrames - 1}
                    step={1}
                    value={frame}
                    onChange={(event) => {
                      setPlaying(false);
                      setFrame(Number(event.target.value));
                    }}
                  />
                  <span className="flex justify-between text-[0.6rem] tabular-nums text-[var(--muted)]">
                    <span>0 h</span>
                    <span>{manifest.cap_hours} h cap</span>
                  </span>
                </label>
              </div>

              <label className="block border-t border-[color:var(--line)] pt-3">
                <span className="block text-[0.66rem] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                  Soot emissions, EI
                </span>
                <span className="block text-sm tabular-nums text-[var(--accent-deep)]">
                  {formatSci(soot[sootIndex])} / kg fuel
                  {loadingSoot ? (
                    <span className="ml-2 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                      loading…
                    </span>
                  ) : null}
                </span>
                <input
                  type="range"
                  className="slider-lg"
                  min={0}
                  max={soot.length - 1}
                  step={1}
                  value={sootIndex}
                  onChange={(event) => setSootIndex(Number(event.target.value))}
                />
                <span className="flex justify-between text-[0.6rem] tabular-nums text-[var(--muted)]">
                  <span>{formatSci(soot[0], 0)}</span>
                  <span>{formatSci(soot[soot.length - 1], 0)}</span>
                </span>
              </label>
            </div>

            <ColourBar manifest={manifest} />

            <p className="mt-4 text-[0.64rem] leading-relaxed text-[var(--muted)]">
              Every run is at an ambient temperature of {manifest.t_amb_k} K, and
              every panel shares one fixed window — {spanKm.toFixed(0)} km across
              the flight path by {spanM.toFixed(0)} m of depth — so a shape in one
              panel means the same thing in all ten. The vertical axis is
              stretched about {exaggeration.toFixed(0)}× relative to the
              horizontal; a real contrail at 20 h is far flatter than it looks
              here. Zero on the vertical axis is the flight level, and the whole
              sheet sinks as the ice sediments.
            </p>
          </aside>

          {/* ---------------- the grid, right ---------------- */}
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1.5">
              <div />
              {manifest.axes.rhi_percent.map((rhi) => (
                <div
                  key={rhi}
                  className="text-center text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--accent-deep)]"
                >
                  RHi {rhi}%
                </div>
              ))}

              {manifest.axes.fsc_ppm.map((fsc, fscIndex) => (
                <FscRow
                  key={fsc}
                  fsc={fsc}
                  fscIndex={fscIndex}
                  manifest={manifest}
                  scalars={scalars}
                  sootIndex={sootIndex}
                  frame={frame}
                  registerCanvas={(rhiIndex, node) => {
                    canvases.current[fscIndex * 2 + rhiIndex] = node;
                  }}
                  onHover={onPanelHover}
                  onLeave={() => setHover(null)}
                />
              ))}

              <div />
              {manifest.axes.rhi_percent.map((rhi) => (
                <div
                  key={`axis-${rhi}`}
                  className="flex justify-between text-[0.6rem] tabular-nums text-[var(--muted)]"
                >
                  <span>{(x_min_m / 1000).toFixed(0)} km</span>
                  <span>across flight path</span>
                  <span>+{(x_max_m / 1000).toFixed(0)} km</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {hover ? (
          <div
            className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 py-1.5 text-[0.68rem] leading-snug tabular-nums text-[var(--accent-deep)] shadow-sm"
            style={{ left: hover.left, top: hover.top }}
          >
            {hover.iwc > 0 ? <>IWC {formatSci(hover.iwc)} kg/m³</> : <>no ice</>}
            <span className="block text-[var(--muted)]">
              {hover.xKm.toFixed(1)} km · {hover.yM.toFixed(0)} m
            </span>
          </div>
        ) : null}
      </div>

      <ScalarTable
        manifest={manifest}
        scalars={scalars}
        sootIndex={sootIndex}
        frame={frame}
      />

      <Section eyebrow="Reading this" title="What the panels do and do not say">
        <ul className="space-y-3 text-sm leading-7 text-[var(--muted)]">
          {manifest.caveats.map((caveat) => (
            <li key={caveat} className="flex gap-3">
              <span
                aria-hidden
                className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]"
              />
              <span>{caveat}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.72rem] leading-relaxed text-[var(--muted)]">
          Payload generated {manifest.generated_utc.slice(0, 10)} from{" "}
          {Object.keys(manifest.cases).length} APCEMM runs
          {manifest.soot_subset
            ? `, carrying ${manifest.axes.soot_ei_per_kg.length} of the ${manifest.soot_subset.source_count} exported soot levels`
            : ""}
          . Ice mass lost to the window across every frame:{" "}
          {manifest.max_clipped_ice_fraction.toExponential(1)} at worst.
        </p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One FSC row: the same soot and the same clock, at both humidities
// ---------------------------------------------------------------------------

function FscRow({
  fsc,
  fscIndex,
  manifest,
  scalars,
  sootIndex,
  frame,
  registerCanvas,
  onHover,
  onLeave,
}: {
  fsc: number;
  fscIndex: number;
  manifest: MovieManifest;
  scalars: Float32Array;
  sootIndex: number;
  frame: number;
  registerCanvas: (rhiIndex: number, node: HTMLCanvasElement | null) => void;
  onHover: (panel: PanelId, event: React.MouseEvent<HTMLCanvasElement>) => void;
  onLeave: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1">
        <span className="text-right text-[0.72rem] leading-tight text-[var(--accent-deep)]">
          <span className="block font-medium tabular-nums">{fsc} ppm</span>
          <span className="block text-[0.6rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            sulfur
          </span>
        </span>
      </div>
      {manifest.axes.rhi_percent.map((rhi, rhiIndex) => {
        const info = caseInfo(manifest, rhiIndex, fscIndex, sootIndex);
        const values = frameScalars(
          manifest,
          scalars,
          rhiIndex,
          fscIndex,
          sootIndex,
          frame,
        );
        return (
          <Panel
            key={rhi}
            manifest={manifest}
            info={info}
            gone={values === null}
            frame={frame}
            label={
              `Ice water content at RHi ${rhi}%, ${fsc} ppm sulfur, ` +
              `${formatHours(manifest.axes.time_hours[frame])} after formation` +
              (values === null ? " — the contrail has dissipated" : "")
            }
            widthKm={values ? values.width_m / 1000 : null}
            registerCanvas={(node) => registerCanvas(rhiIndex, node)}
            onHover={(event) => onHover({ rhiIndex, fscIndex }, event)}
            onLeave={onLeave}
          />
        );
      })}
    </>
  );
}

function Panel({
  manifest,
  info,
  gone,
  frame,
  label,
  widthKm,
  registerCanvas,
  onHover,
  onLeave,
}: {
  manifest: MovieManifest;
  info: CaseInfo | undefined;
  gone: boolean;
  frame: number;
  label: string;
  widthKm: number | null;
  registerCanvas: (node: HTMLCanvasElement | null) => void;
  onHover: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onLeave: () => void;
}) {
  const { nx, ny } = manifest.window;
  const censored = info?.status === STATUS_CENSORED;
  const atCap = frame >= (info?.n_frames ?? 0) - 1;

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-md border border-[color:var(--line)]"
        style={{ background: `rgb(${NO_ICE_RGB.join(",")})` }}
      >
        <canvas
          ref={registerCanvas}
          width={nx}
          height={ny}
          onMouseMove={onHover}
          onMouseLeave={onLeave}
          role="img"
          aria-label={label}
          className="block w-full"
          style={{ aspectRatio: PANEL_ASPECT }}
        />
        {/* Flight level: the datum the sinking is relative to. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[color:var(--muted)]/35"
          style={{
            top: `${
              ((manifest.window.y_max_m - 0) /
                (manifest.window.y_max_m - manifest.window.y_min_m)) *
              100
            }%`,
          }}
        />
        {gone ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-[color:var(--surface)]/85 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              dissipated
              {info?.dissipated_hours != null
                ? ` at ${info.dissipated_hours.toFixed(1)} h`
                : ""}
            </span>
          </div>
        ) : null}
        {widthKm != null ? (
          <span className="pointer-events-none absolute left-1.5 top-1 text-[0.6rem] tabular-nums text-[var(--muted)]">
            {widthKm.toFixed(1)} km wide
          </span>
        ) : null}
        {censored && atCap ? (
          <span className="pointer-events-none absolute right-1.5 top-1 text-[0.6rem] text-[var(--accent-deep)]">
            still alive at the cap
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Colour scale
// ---------------------------------------------------------------------------

function ColourBar({ manifest }: { manifest: MovieManifest }) {
  const floor = manifest.quantization.display_floor_kg_m3;
  const ceiling = manifest.quantization.ceiling_kg_m3;
  // Sampled densely because the gamma makes the gradient non-linear in
  // position; a browser gradient interpolates straight lines between stops.
  const stops = Array.from({ length: 48 }, (_, i) => {
    const t = i / 47;
    const [r, g, b] = rampColour(
      scalePosition(floor * Math.pow(ceiling / floor, t), floor, ceiling),
    );
    return `rgb(${r},${g},${b}) ${(t * 100).toFixed(1)}%`;
  });
  const decades: number[] = [];
  for (let exp = Math.ceil(Math.log10(floor)); Math.pow(10, exp) <= ceiling; exp++) {
    decades.push(Math.pow(10, exp));
  }
  const logLo = Math.log10(floor);
  const logSpan = Math.log10(ceiling) - logLo;

  return (
    <div className="mt-5 max-w-xl">
      <div className="flex items-baseline justify-between text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted)]">
        <span>Ice water content, kg / m³</span>
        <span className="normal-case tracking-normal">log scale</span>
      </div>
      <div className="mt-1 flex items-stretch gap-2">
        <span
          aria-hidden
          className="w-6 shrink-0 rounded-sm border border-[color:var(--line)]"
          style={{ background: `rgb(${NO_ICE_RGB.join(",")})` }}
        />
        <div className="relative flex-1">
          <div
            className="h-3.5 rounded-sm border border-[color:var(--line)]"
            style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
          />
          <div className="relative mt-0.5 h-4">
            {decades.map((value) => (
              <span
                key={value}
                className="absolute -translate-x-1/2 text-[0.6rem] tabular-nums text-[var(--muted)]"
                style={{
                  left: `${((Math.log10(value) - logLo) / logSpan) * 100}%`,
                }}
              >
                {value.toExponential(0)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--muted)]">
        The block on the left is no ice. The scale is logarithmic from{" "}
        {floor.toExponential(0)} kg/m³, and its colours are weighted toward the
        upper decades: four fifths of a contrail&rsquo;s ice mass sits in the
        top third of that range, so an even split would spend most of the ramp
        on the faint rim and paint the interior as one flat colour. Every cell
        the payload holds is still drawn, and the labels sit at their true
        values.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The same frame as numbers
// ---------------------------------------------------------------------------

const TABLE_COLUMNS: Array<{ name: string; label: string; format: (v: number) => string }> = [
  { name: "width_m", label: "Width", format: (v) => `${(v / 1000).toFixed(1)} km` },
  { name: "depth_m", label: "Depth", format: (v) => `${v.toFixed(0)} m` },
  { name: "int_od_m", label: "∫OD dx", format: (v) => `${v.toFixed(0)} m` },
  { name: "ice_mass_kg_m", label: "Ice mass", format: (v) => `${v.toFixed(2)} kg/m` },
  {
    name: "n_ice_particles_per_m",
    label: "Ice particles",
    format: (v) => `${formatSci(v)} /m`,
  },
  {
    name: "peak_iwc_kg_m3",
    label: "Peak IWC",
    format: (v) => `${formatSci(v)} kg/m³`,
  },
];

function ScalarTable({
  manifest,
  scalars,
  sootIndex,
  frame,
}: {
  manifest: MovieManifest;
  scalars: Float32Array;
  sootIndex: number;
  frame: number;
}) {
  return (
    <Section
      eyebrow="This frame"
      title={`The ten panels as numbers, at ${formatHours(
        manifest.axes.time_hours[frame],
      )}`}
      description={
        "Peak IWC is the undiluted value on APCEMM's own 50 × 7 m grid, which " +
        "the panels' area-averaging necessarily softens. A dash is a contrail " +
        "that no longer exists at this time."
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-[0.72rem] tabular-nums">
          <thead className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr className="border-b border-[color:var(--line)]">
              <th className="py-2 pr-3 font-medium">RHi</th>
              <th className="py-2 pr-3 font-medium">FSC</th>
              {TABLE_COLUMNS.map((column) => (
                <th key={column.name} className="py-2 pr-3 font-medium">
                  {column.label}
                </th>
              ))}
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-[var(--accent-deep)]">
            {manifest.axes.rhi_percent.map((rhi, rhiIndex) =>
              manifest.axes.fsc_ppm.map((fsc, fscIndex) => {
                const values = frameScalars(
                  manifest,
                  scalars,
                  rhiIndex,
                  fscIndex,
                  sootIndex,
                  frame,
                );
                const info = caseInfo(manifest, rhiIndex, fscIndex, sootIndex);
                return (
                  <tr
                    key={`${rhi}-${fsc}`}
                    className="border-b border-[color:var(--line)]/60"
                  >
                    <td className="py-1.5 pr-3">{rhi}%</td>
                    <td className="py-1.5 pr-3">{fsc} ppm</td>
                    {TABLE_COLUMNS.map((column) => (
                      <td key={column.name} className="py-1.5 pr-3">
                        {values && Number.isFinite(values[column.name])
                          ? column.format(values[column.name])
                          : "—"}
                      </td>
                    ))}
                    <td className="py-1.5 text-[var(--muted)]">
                      {info?.status === STATUS_CENSORED
                        ? "alive at 20 h cap"
                        : info?.dissipated_hours != null
                          ? `dissipated ${info.dissipated_hours.toFixed(1)} h`
                          : "—"}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
