"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Section } from "@/components/section";
import {
  type BandPoint,
  type CubeData,
  type Selection,
  loadCube,
  reduceBand,
  selectionSize,
} from "@/lib/uncertainty-cube";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
// Model blue is the site accent. The three measurement hues were checked with
// the dataviz validator against that blue and each other (all six checks pass
// in light mode: worst adjacent CVD deltaE 17.8 deutan, normal-vision 26.8).
// Campaign is additionally encoded by marker shape, so identity never rests on
// colour alone.

const MODEL_BLUE = "#1f6fb2";
const MODEL_DEEP = "#0b3a63";

const CAMPAIGN_STYLE = {
  "ECLIF3-2": { color: "#d95f02", shape: "square" as const },
  "ECLIF3-1": { color: "#8e44ad", shape: "triangle" as const },
  VOLCAN: { color: "#117733", shape: "circle" as const },
};

type CampaignName = keyof typeof CAMPAIGN_STYLE;

// ---------------------------------------------------------------------------
// Measured points
// ---------------------------------------------------------------------------
// Ported from pyEPM scripts/plot_alpha_C_karcher.py:CASES.
//
// ECLIF3 from Dischl et al. (2025) Fig. 4b; VOLCAN from Voigt et al. (2026)
// Nature 652 Fig. 2, lean-burn (low-soot) points only.
//
// Coordinates and error bars were digitised from the published figures with a
// pixel-calibration script. They are approximate -- a few percent on the linear
// Dischl axes, and read off log-log axes for Voigt. Nulls are directions where
// the published figure shows no bar, not zero-width uncertainty.

type MeasuredPoint = {
  label: string;
  campaign: CampaignName;
  fsc: number;
  x: number;
  y: number;
  xLo: number | null;
  xHi: number | null;
  yLo: number | null;
  yHi: number | null;
};

const MEASURED: MeasuredPoint[] = [
  {
    label: "ECLIF3-2 med-S blend", campaign: "ECLIF3-2", fsc: 505,
    x: 0.672e15, y: 1.477e15,
    xLo: 0.603e15, xHi: 0.804e15, yLo: 0.81e15, yHi: 1.808e15,
  },
  {
    label: "ECLIF3-2 low-S Jet A-1", campaign: "ECLIF3-2", fsc: 125,
    x: 0.763e15, y: 0.54e15,
    xLo: 0.529e15, xHi: 0.915e15, yLo: 0.307e15, yHi: 0.855e15,
  },
  {
    label: "ECLIF3-2 ultra-low-S HEFA-SPK", campaign: "ECLIF3-2", fsc: 3,
    x: 0.562e15, y: 0.52e15,
    xLo: 0.504e15, xHi: 0.672e15, yLo: 0.266e15, yHi: 0.774e15,
  },
  {
    label: "ECLIF3-1 Jet A-1", campaign: "ECLIF3-1", fsc: 211,
    x: 0.71e15, y: 0.88e15,
    xLo: 0.631e15, xHi: 0.843e15, yLo: 0.561e15, yHi: 1.527e15,
  },
  {
    label: "ECLIF3-1 HEFA-SPK", campaign: "ECLIF3-1", fsc: 7,
    x: 0.501e15, y: 0.305e15,
    xLo: 0.452e15, xHi: 0.603e15, yLo: 0.17e15, yHi: 0.547e15,
  },
  {
    label: "VOLCAN HEFA blend (lean)", campaign: "VOLCAN", fsc: 75,
    x: 3.44e11, y: 4.48e14,
    xLo: null, xHi: null, yLo: 2.64e14, yHi: 6.43e14,
  },
  {
    label: "VOLCAN Jet A-1 (lean)", campaign: "VOLCAN", fsc: 192,
    x: 6.64e11, y: 1.47e15,
    xLo: 1.79e11, xHi: 1.19e12, yLo: null, yHi: null,
  },
];

/** Recharts ErrorBar wants [minusOffset, plusOffset], not absolute caps. */
function errorOffsets(
  value: number,
  lo: number | null,
  hi: number | null,
): [number, number] | undefined {
  if (lo === null && hi === null) return undefined;
  return [
    lo === null ? 0 : Math.max(0, value - lo),
    hi === null ? 0 : Math.max(0, hi - value),
  ];
}

const MEASURED_ROWS = MEASURED.map((p) => ({
  ...p,
  xErr: errorOffsets(p.x, p.xLo, p.xHi),
  yErr: errorOffsets(p.y, p.yLo, p.yHi),
}));

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function toSuperscript(n: number): string {
  const rounded = Math.round(n);
  if (rounded < 0) return "⁻" + toSuperscript(-rounded);
  return rounded
    .toString()
    .split("")
    .map((d) => SUPERSCRIPTS[Number(d)])
    .join("");
}

function formatPow10(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "";
  return `10${toSuperscript(Math.log10(v))}`;
}

function formatSci(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / Math.pow(10, e);
  return `${m.toFixed(2)} × 10${toSuperscript(e)}`;
}

/** Decade ticks spanning a domain, for a log axis. */
function decadeTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    out.push(Math.pow(10, e));
  }
  return out;
}

const AXIS_LABEL: Record<string, string> = {
  alpha_C: "α_C — water accommodation coefficient",
  FSC: "FSC — fuel sulfur content [ppm]",
  T_amb: "T_amb — ambient temperature [K]",
  N0: "N₀ — initial dilution [kg-air / kg-fuel]",
  tau_m: "τ_m — jet mixing timescale [s]",
  soot: "EI(soot) [# / kg-fuel]",
};

function formatAxisValue(axis: string, v: number): string {
  if (axis === "soot") return formatPow10(v);
  if (axis === "tau_m") return v.toFixed(3);
  if (axis === "alpha_C") return String(v);
  return Number.isInteger(v) ? String(v) : String(v);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VARIABLE = "total_ice_per_kgfuel";

export function UncertaintyExplorer() {
  const [data, setData] = useState<CubeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [showMeasured, setShowMeasured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadCube()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Everything selected: the widest, most honest default band.
        const initial: Selection = {};
        for (const name of d.axisNames.slice(1)) {
          initial[name] = d.manifest.axes[name].map((_, i) => i);
        }
        setSelection(initial);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nuisanceAxes = data ? data.axisNames.slice(1) : [];

  const band: BandPoint[] = useMemo(
    () => (data ? reduceBand(data, VARIABLE, selection) : []),
    [data, selection],
  );

  const nCells = data ? selectionSize(data, selection) : 0;
  const nMissing = band.reduce((acc, p) => acc + p.nMissing, 0);
  const provisional = Boolean(data && !data.manifest.coverage.complete);
  const emptySelection = nuisanceAxes.some(
    (name) => (selection[name]?.length ?? 0) === 0,
  );

  const domains = useMemo(() => {
    if (!data) return null;
    const xs = [...band.map((p) => p.x), ...MEASURED.map((p) => p.x)];
    const ys = [
      ...band.flatMap((p) => [p.min, p.max]),
      ...MEASURED.flatMap((p) => [p.yLo ?? p.y, p.yHi ?? p.y]),
    ].filter((v) => Number.isFinite(v) && v > 0);
    const xLo = Math.pow(10, Math.floor(Math.log10(Math.min(...xs))));
    const xHi = Math.pow(10, Math.ceil(Math.log10(Math.max(...xs))));
    const yLo = Math.pow(10, Math.floor(Math.log10(Math.min(...ys))));
    const yHi = Math.pow(10, Math.ceil(Math.log10(Math.max(...ys))));
    return { x: [xLo, xHi] as [number, number], y: [yLo, yHi] as [number, number] };
  }, [data, band]);

  function toggle(axis: string, index: number) {
    setSelection((prev) => {
      const current = prev[axis] ?? [];
      const next = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index].sort((a, b) => a - b);
      return { ...prev, [axis]: next };
    });
  }

  function setAll(axis: string, all: boolean) {
    if (!data) return;
    setSelection((prev) => ({
      ...prev,
      [axis]: all ? data.manifest.axes[axis].map((_, i) => i) : [],
    }));
  }

  function resetAll() {
    if (!data) return;
    const next: Selection = {};
    for (const name of nuisanceAxes) {
      next[name] = data.manifest.axes[name].map((_, i) => i);
    }
    setSelection(next);
  }

  function pinToBaseline() {
    if (!data) return;
    const next: Selection = {};
    for (const name of nuisanceAxes) {
      const baseline = data.manifest.axis_baseline?.[name];
      next[name] =
        baseline && baseline.index !== null
          ? [baseline.index]
          : data.manifest.axes[name].map((_, i) => i);
    }
    setSelection(next);
  }

  if (error) {
    return (
      <Section eyebrow="Uncertainty" title="Envelope explorer">
        <p className="text-sm text-[var(--muted)]">
          Could not load the uncertainty cube: {error}
        </p>
      </Section>
    );
  }

  if (!data || !domains) {
    return (
      <Section eyebrow="Uncertainty" title="Envelope explorer">
        <p className="text-sm text-[var(--muted)]">Loading the parameter cube…</p>
      </Section>
    );
  }

  const campaignsShown = Array.from(
    new Set(MEASURED.map((p) => p.campaign)),
  ) as CampaignName[];

  return (
    <>
      <Section
        eyebrow="Uncertainty"
        title="How much of the contrail-ice signal is parameter uncertainty?"
        description={
          "Every curve pyEPM can draw through AEI(ice) against EI(soot), given six " +
          "parameters swept across their plausible ranges. The shaded region is the " +
          "full spread of model outcomes at each soot value; narrow it by fixing " +
          "parameters you are willing to commit to, and watch how much of the band " +
          "each one was responsible for."
        }
      >
        <div className="space-y-6">
          {provisional ? (
            <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              <span className="font-medium text-[var(--accent-deep)]">
                Provisional band.
              </span>{" "}
              {data.manifest.coverage.n_present.toLocaleString()} of{" "}
              {data.manifest.coverage.n_cases.toLocaleString()} grid cases have
              finished ({" "}
              {(
                (100 * data.manifest.coverage.n_present) /
                data.manifest.coverage.n_cases
              ).toFixed(1)}
              % ). Missing cases are skipped rather than interpolated, so the
              band shown is a lower bound on its true width — it can only widen
              as the remaining runs land.
            </div>
          ) : null}

          {emptySelection ? (
            <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              At least one parameter has no value selected, so there is nothing
              to reduce over. Select a value, or use <em>Free everything</em>.
            </div>
          ) : null}

          <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart
                data={band}
                margin={{ top: 16, right: 24, bottom: 48, left: 16 }}
              >
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="2 4"
                  vertical
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="log"
                  domain={domains.x}
                  ticks={decadeTicks(domains.x[0], domains.x[1])}
                  tickFormatter={formatPow10}
                  stroke="var(--muted)"
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  label={{
                    value: "EI(soot)  [# / kg-fuel]",
                    position: "insideBottom",
                    offset: -28,
                    style: { fill: "var(--muted)", fontSize: 13 },
                  }}
                />
                <YAxis
                  type="number"
                  scale="log"
                  domain={domains.y}
                  ticks={decadeTicks(domains.y[0], domains.y[1])}
                  tickFormatter={formatPow10}
                  stroke="var(--muted)"
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  width={64}
                  label={{
                    value: "AEI(ice)  [# / kg-fuel]",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "var(--muted)", fontSize: 13 },
                  }}
                />
                <Tooltip
                  content={<BandTooltip nCells={nCells} />}
                  cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  height={36}
                  wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
                />

                {/* The band. A range Area takes [lo, hi] per row, which keeps
                    both endpoints positive and therefore plottable on a log
                    axis -- a stacked base+span area would need a zero
                    baseline. */}
                <Area
                  name="Model range"
                  type="monotone"
                  dataKey={(row: BandPoint) => [row.min, row.max]}
                  stroke={MODEL_BLUE}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  fill={MODEL_BLUE}
                  fillOpacity={0.16}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  name="Nominal (all defaults)"
                  type="monotone"
                  dataKey="nominal"
                  stroke={MODEL_DEEP}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {showMeasured
                  ? campaignsShown.map((campaign) => (
                      <Scatter
                        key={campaign}
                        name={campaign}
                        data={MEASURED_ROWS.filter(
                          (p) => p.campaign === campaign,
                        )}
                        dataKey="y"
                        fill={CAMPAIGN_STYLE[campaign].color}
                        shape={CAMPAIGN_STYLE[campaign].shape}
                        isAnimationActive={false}
                      >
                        <ErrorBar
                          dataKey="yErr"
                          direction="y"
                          width={4}
                          strokeWidth={1.5}
                          stroke={CAMPAIGN_STYLE[campaign].color}
                        />
                        <ErrorBar
                          dataKey="xErr"
                          direction="x"
                          width={4}
                          strokeWidth={1.5}
                          stroke={CAMPAIGN_STYLE[campaign].color}
                        />
                      </Scatter>
                    ))
                  : null}
              </ComposedChart>
            </ResponsiveContainer>

            <p className="mt-2 text-xs text-[var(--muted)]">
              Band = min/max over {nCells.toLocaleString()} parameter
              combination{nCells === 1 ? "" : "s"} at each soot value
              {nMissing > 0
                ? `, of which ${nMissing.toLocaleString()} are still running and were skipped`
                : ""}
              . This is a <em>range</em>, not a confidence interval — see the
              note below.
            </p>
          </div>

          {/* ----------------------------------------------------------- */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                Parameters
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Free everything
                </button>
                <button
                  type="button"
                  onClick={pinToBaseline}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Pin all to defaults
                </button>
                <button
                  type="button"
                  onClick={() => setShowMeasured((v) => !v)}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  {showMeasured ? "Hide" : "Show"} measurements
                </button>
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Each row is one swept parameter. Every value selected means the
              band is free to range over it; a single value fixes it. Selecting
              a subset expresses a partial commitment — &ldquo;α_C is somewhere
              between 0.4 and 1&rdquo; — which is the honest position for most
              of these. EI(soot) is the x-axis and so is never fixed here.
            </p>

            <div className="grid gap-4">
              {nuisanceAxes.map((axis) => {
                const values = data.manifest.axes[axis];
                const chosen = selection[axis] ?? [];
                const baseline = data.manifest.axis_baseline?.[axis];
                const isFree = chosen.length === values.length;
                return (
                  <div
                    key={axis}
                    className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)]/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--accent-deep)]">
                        {AXIS_LABEL[axis] ?? axis}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {chosen.length === 0
                          ? "none selected"
                          : isFree
                            ? `free (${values.length} values)`
                            : chosen.length === 1
                              ? "fixed"
                              : `${chosen.length} of ${values.length}`}
                        {" · "}
                        <button
                          type="button"
                          className="underline underline-offset-2 hover:text-[var(--accent)]"
                          onClick={() => setAll(axis, !isFree)}
                        >
                          {isFree ? "clear" : "all"}
                        </button>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {values.map((value, index) => {
                        const active = chosen.includes(index);
                        const isBaseline = baseline?.index === index;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggle(axis, index)}
                            aria-pressed={active}
                            title={
                              isBaseline
                                ? "Model default for this parameter"
                                : undefined
                            }
                            className={[
                              "rounded-full border px-2.5 py-1 text-xs tabular-nums transition",
                              active
                                ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                                : "border-[color:var(--line)] bg-[color:var(--surface)] text-[var(--muted)] hover:border-[color:var(--accent)]",
                            ].join(" ")}
                          >
                            {formatAxisValue(axis, value)}
                            {isBaseline ? (
                              <span
                                aria-hidden
                                className={
                                  active ? "ml-1 opacity-80" : "ml-1 opacity-60"
                                }
                              >
                                ★
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--muted)]">
              ★ marks the value used in the model&rsquo;s own default input, so
              the nominal curve is the cell where every ★ coincides — read
              directly from the grid, not interpolated.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Reading this" title="What the band is, and is not">
        <div className="grid gap-6 text-sm leading-7 text-[var(--muted)] sm:grid-cols-2">
          <div className="space-y-3">
            <p>
              <strong className="text-[var(--accent-deep)]">
                It is a range, not a confidence interval.
              </strong>{" "}
              The grid is a full factorial with 3–15 uniformly spaced values per
              axis and no argued prior over them. A percentile band would imply
              a rigour the design does not have, so the shading is the outright
              minimum and maximum of the selected cross-product.
            </p>
            <p>
              <strong className="text-[var(--accent-deep)]">
                τ_m&rsquo;s range is assumed.
              </strong>{" "}
              The ±40% spread on the Kärcher-2015 mixing timescale is a
              sensitivity assumption, not a measured or published range. Treat
              its contribution to the band accordingly.
            </p>
            <p>
              <strong className="text-[var(--accent-deep)]">
                Grid resolution contributes a few percent.
              </strong>{" "}
              Sulfur ice does not fully grid-converge; the campaign ran at 1,028
              sulfur bins to keep that residual well inside the error budget. It
              is negligible against a band that is decades wide.
            </p>
          </div>
          <div className="space-y-3">
            <p>
              <strong className="text-[var(--accent-deep)]">
                The measured points are digitised.
              </strong>{" "}
              ECLIF3 from Dischl et al. (2025) Fig. 4b, VOLCAN from Voigt et al.
              (2026) Fig. 2 (lean-burn points only), both read off the published
              figures with a pixel-calibration script. Treat the coordinates and
              bars as approximate. Where a bar is absent the figure showed none;
              it does not mean the uncertainty is zero.
            </p>
            <p>
              <strong className="text-[var(--accent-deep)]">
                Every point is a real model run.
              </strong>{" "}
              Nothing on this page is interpolated. Each grid cell is one pyEPM
              solve to t = {data.manifest.final_time_s} s, from campaign{" "}
              <code className="text-xs">
                array-{data.manifest.source_campaign.array_job_id}
              </code>{" "}
              at model revision{" "}
              <code className="text-xs">
                {data.manifest.source_campaign.pyepm_git_sha?.slice(0, 9)}
              </code>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

type TooltipPayloadItem = { payload?: BandPoint & Partial<MeasuredPoint> };

function BandTooltip({
  active,
  payload,
  nCells,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  nCells?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // A measured point wins the tooltip when the cursor is on one: it carries a
  // label, which the band rows never do.
  const measured = payload.find((item) => item.payload?.label);
  if (measured?.payload) {
    const p = measured.payload as MeasuredPoint;
    return (
      <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-xs shadow-sm">
        <div className="font-medium text-[var(--accent-deep)]">{p.label}</div>
        <div className="mt-1 text-[var(--muted)]">FSC {p.fsc} ppm</div>
        <div className="text-[var(--muted)]">
          EI(soot) {formatSci(p.x)}
          {p.xLo !== null || p.xHi !== null
            ? `  [${formatSci(p.xLo)} – ${formatSci(p.xHi)}]`
            : ""}
        </div>
        <div className="text-[var(--muted)]">
          AEI(ice) {formatSci(p.y)}
          {p.yLo !== null || p.yHi !== null
            ? `  [${formatSci(p.yLo)} – ${formatSci(p.yHi)}]`
            : ""}
        </div>
      </div>
    );
  }

  const row = payload[0]?.payload as BandPoint | undefined;
  if (!row || !Number.isFinite(row.min)) return null;
  const ratio = row.min > 0 ? row.max / row.min : NaN;

  return (
    <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-[var(--accent-deep)]">
        EI(soot) = {formatSci(row.x)}
      </div>
      <dl className="mt-1 space-y-0.5 text-[var(--muted)]">
        <div className="flex gap-3">
          <dt className="w-16">max</dt>
          <dd className="tabular-nums">{formatSci(row.max)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-16">min</dt>
          <dd className="tabular-nums">{formatSci(row.min)}</dd>
        </div>
        {row.nominal !== null ? (
          <div className="flex gap-3">
            <dt className="w-16">nominal</dt>
            <dd className="tabular-nums">{formatSci(row.nominal)}</dd>
          </div>
        ) : null}
        {Number.isFinite(ratio) ? (
          <div className="flex gap-3">
            <dt className="w-16">spread</dt>
            <dd className="tabular-nums">×{ratio.toFixed(1)}</dd>
          </div>
        ) : null}
        <div className="pt-1 text-[0.68rem] opacity-80">
          over {(nCells ?? row.n).toLocaleString()} combinations
          {row.nMissing > 0 ? `, ${row.nMissing} still running` : ""}
        </div>
      </dl>
    </div>
  );
}
