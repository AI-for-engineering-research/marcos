"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  variableExtent,
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

// FSC and T_amb are the conditions each flight was flown and modelled at, taken
// from pyEPM data/uncertainty_analysis/alpha_C/ice_extract.csv -- the per-case
// ambient conditions the alpha_C campaign ran, which came from the papers'
// reported values. They are NOT swept quantities here: they say where on the
// band's parameter space each measurement sits, which is the point of listing
// them beside the chart.
//
// All seven share pressure 22,919.5 Pa and RHi 110%.

type MeasuredPoint = {
  id: string;
  label: string;
  campaign: CampaignName;
  fsc: number;
  tAmb: number;
  x: number;
  y: number;
  xLo: number | null;
  xHi: number | null;
  yLo: number | null;
  yHi: number | null;
};

const MEASURED: MeasuredPoint[] = [
  {
    id: "eclif32-blend", label: "Med-S blend", campaign: "ECLIF3-2",
    fsc: 505, tAmb: 215.8,
    x: 0.672e15, y: 1.477e15,
    xLo: 0.603e15, xHi: 0.804e15, yLo: 0.81e15, yHi: 1.808e15,
  },
  {
    id: "eclif32-jeta1", label: "Low-S Jet A-1", campaign: "ECLIF3-2",
    fsc: 125, tAmb: 217.0,
    x: 0.763e15, y: 0.54e15,
    xLo: 0.529e15, xHi: 0.915e15, yLo: 0.307e15, yHi: 0.855e15,
  },
  {
    id: "eclif32-hefa", label: "Ultra-low-S HEFA-SPK", campaign: "ECLIF3-2",
    fsc: 3, tAmb: 215.8,
    x: 0.562e15, y: 0.52e15,
    xLo: 0.504e15, xHi: 0.672e15, yLo: 0.266e15, yHi: 0.774e15,
  },
  {
    id: "eclif31-jeta1", label: "Jet A-1", campaign: "ECLIF3-1",
    fsc: 211, tAmb: 213.3,
    x: 0.71e15, y: 0.88e15,
    xLo: 0.631e15, xHi: 0.843e15, yLo: 0.561e15, yHi: 1.527e15,
  },
  {
    id: "eclif31-hefa", label: "HEFA-SPK", campaign: "ECLIF3-1",
    fsc: 7, tAmb: 213.8,
    x: 0.501e15, y: 0.305e15,
    xLo: 0.452e15, xHi: 0.603e15, yLo: 0.17e15, yHi: 0.547e15,
  },
  {
    id: "volcan-hefa", label: "HEFA blend (lean)", campaign: "VOLCAN",
    fsc: 75, tAmb: 218.0,
    x: 3.44e11, y: 4.48e14,
    xLo: null, xHi: null, yLo: 2.64e14, yHi: 6.43e14,
  },
  {
    id: "volcan-jeta1", label: "Jet A-1 (lean)", campaign: "VOLCAN",
    fsc: 192, tAmb: 218.0,
    x: 6.64e11, y: 1.47e15,
    xLo: 1.79e11, xHi: 1.19e12, yLo: null, yHi: null,
  },
];

const CAMPAIGN_ORDER: CampaignName[] = ["ECLIF3-2", "ECLIF3-1", "VOLCAN"];

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

// ---------------------------------------------------------------------------
// Typeset axis titles
// ---------------------------------------------------------------------------

// The axis titles are set the way the paper sets them -- EI_soot, AEI_ice,
// kg_fuel^-1 -- with real subscripts and superscripts rather than the ASCII
// "EI(soot) [# / kg-fuel]" they used to be.
//
// Done as SVG tspans rather than by rendering LaTeX: the titles are symbols
// with sub/superscripts and no fractions, radicals or operators, so KaTeX
// would add a dependency and a foreignObject inside the chart SVG to typeset
// something tspans already set correctly, in the chart's own font.

type MathRun = { t: string; sub?: boolean; sup?: boolean; italic?: boolean };

/**
 * Runs laid out on one baseline. Each tspan's `dy` is the DELTA from the
 * previous run's shift, since dy accumulates in SVG -- computing it as an
 * absolute offset walks the text off the baseline after the second script.
 */
function mathRuns(runs: MathRun[], size: number) {
  const scriptSize = Math.round(size * 0.76);
  let shift = 0;
  return runs.map((run, i) => {
    const target = run.sub ? size * 0.24 : run.sup ? -size * 0.42 : 0;
    const dy = target - shift;
    shift = target;
    return (
      <tspan
        key={i}
        dy={dy}
        fontSize={run.sub || run.sup ? scriptSize : size}
        fontStyle={run.italic ? "italic" : undefined}
      >
        {run.t}
      </tspan>
    );
  });
}

/** "# kg_fuel^-1", the units both axes carry. */
const PER_KG_FUEL: MathRun[] = [
  { t: "  [# kg" },
  { t: "fuel", sub: true },
  { t: "−1", sup: true },
  { t: "]" },
];

const X_TITLE: MathRun[] = [
  { t: "EI", italic: true },
  { t: "soot", sub: true },
  ...PER_KG_FUEL,
];

const Y_TITLE: MathRun[] = [
  { t: "AEI", italic: true },
  { t: "ice", sub: true },
  ...PER_KG_FUEL,
];

type AxisLabelProps = {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
};

function XAxisTitle({ viewBox }: AxisLabelProps) {
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox ?? {};
  return (
    <text
      x={x + width / 2}
      y={y + height + 36}
      textAnchor="middle"
      fill="var(--muted)"
      fontSize={13}
    >
      {mathRuns(X_TITLE, 13)}
    </text>
  );
}

function YAxisTitle({ viewBox }: AxisLabelProps) {
  const { x = 0, y = 0, height = 0 } = viewBox ?? {};
  const cx = x + 14;
  const cy = y + height / 2;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      fill="var(--muted)"
      fontSize={13}
      transform={`rotate(-90 ${cx} ${cy})`}
    >
      {mathRuns(Y_TITLE, 13)}
    </text>
  );
}

/** Decade ticks spanning a domain, for a log axis. */
function decadeTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    out.push(Math.pow(10, e));
  }
  return out;
}

// Split into name and unit so the narrow left column can put them on two lines
// without wrapping mid-phrase.
const AXIS_SHORT: Record<string, string> = {
  alpha_C: "α_C",
  FSC: "FSC",
  T_amb: "T_amb",
  N0: "N₀",
  tau_m: "τ_m",
  T_exit: "T_exit",
  soot_dD: "d/D",
  soot: "EI(soot)",
};

const AXIS_UNIT: Record<string, string> = {
  alpha_C: "water accommodation",
  FSC: "fuel sulfur, ppm",
  T_amb: "ambient temp., K",
  N0: "initial dilution, kg/kg",
  tau_m: "jet mixing time, s",
  T_exit: "plume exit temp., K",
  soot_dD: "primary/aggregate ratio",
  soot: "# / kg-fuel",
};

// The two kinds of thing being varied, which are not equally knowable and
// should not read as one undifferentiated list.
//
// Inputs are properties of a particular flight: you can look them up or measure
// them, so fixing one is a statement about which flight you are asking about.
// Assumptions are model closure parameters with no measured value at all --
// tau_m's range is explicitly an assumed sensitivity spread, not a literature
// one -- so fixing one is a statement about what you are willing to believe.
//
// Any axis not named here still gets a card under "Other", because an axis
// silently missing from this column would be a control the reader cannot see
// but that is still widening the band.
const AXIS_GROUPS: { title: string; note: string; axes: string[] }[] = [
  {
    title: "Inputs",
    note: "flight and atmospheric conditions",
    axes: ["FSC", "T_amb", "N0", "T_exit"],
  },
  {
    title: "Assumptions",
    note: "model parameters with no measured value",
    axes: ["alpha_C", "tau_m", "soot_dD"],
  },
];

/** Group the cube's nuisance axes for display, keeping every one of them. */
function groupAxes(axes: string[]) {
  const known = new Set(AXIS_GROUPS.flatMap((g) => g.axes));
  const groups = AXIS_GROUPS.map((g) => ({
    ...g,
    axes: g.axes.filter((a) => axes.includes(a)),
  })).filter((g) => g.axes.length > 0);

  const rest = axes.filter((a) => !known.has(a));
  return rest.length > 0
    ? [...groups, { title: "Other", note: "also swept", axes: rest }]
    : groups;
}

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

/**
 * How one parameter is being committed.
 *
 * "range" is a two-knob slider spanning min..max of the values to include.
 * "fix" is a one-knob slider committing the parameter to a single value.
 *
 * Both are DETENTED: they step between grid values and cannot land between
 * them, so every value the page draws is a case pyEPM actually ran.
 *
 * The knob slider replaced per-value chips, which could express a
 * non-contiguous subset such as alpha_C in {0.05, 1.0} -- either extreme but
 * not the middle. A contiguous span cannot say that. It is the right trade for
 * a band whose reading is "somewhere between these two bounds", but it is a
 * real loss of expressiveness rather than a pure simplification.
 *
 * A range spans at least two values: its knobs cannot cross and cannot meet.
 * One value is what fix mode is for, which keeps each control answering
 * exactly one question.
 */
type AxisMode = "fix" | "range";

/** Inclusive index span of a range-mode axis: [lo, hi], lo <= hi. */
type Span = [number, number];

function spanIndices([lo, hi]: Span): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/** The span a selection covers, tolerating the empty and unsorted cases. */
function spanOf(chosen: number[], n: number): Span {
  if (chosen.length === 0) return [0, n - 1];
  return [Math.min(...chosen), Math.max(...chosen)];
}

export function UncertaintyExplorer() {
  const [data, setData] = useState<CubeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [modes, setModes] = useState<Record<string, AxisMode>>({});
  // Raw knob positions, kept alongside the selection rather than derived from
  // it. Deriving them as min/max would make a knob dragged past its twin snap
  // backwards mid-drag, because its own value prop would be rewritten to the
  // other bound. Selection stays the source of truth for the chart.
  const [knobs, setKnobs] = useState<Record<string, Span>>({});
  // A span survives a trip through fix mode and back, so switching modes to
  // look at one value is not destructive.
  const rangeMemory = useRef<Record<string, Span>>({});
  const [shownPoints, setShownPoints] = useState<Set<string>>(
    () => new Set(MEASURED.map((p) => p.id)),
  );

  useEffect(() => {
    let cancelled = false;
    loadCube()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Start pinned to the model defaults. Axes without an on-grid default
        // stay free, because picking an arbitrary fixed value would imply a
        // default the manifest does not actually define.
        const initial: Selection = {};
        const initialModes: Record<string, AxisMode> = {};
        const initialKnobs: Record<string, Span> = {};
        for (const name of d.axisNames.slice(1)) {
          const baseline = d.manifest.axis_baseline?.[name];
          const pinned = baseline && baseline.index !== null;
          const n = d.manifest.axes[name].length;
          if (pinned) {
            const i = baseline.index as number;
            initial[name] = [i];
            initialModes[name] = "fix";
            initialKnobs[name] = [i, i];
          } else {
            initial[name] = spanIndices([0, n - 1]);
            initialModes[name] = "range";
            initialKnobs[name] = [0, n - 1];
          }
        }
        setSelection(initial);
        setModes(initialModes);
        setKnobs(initialKnobs);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Memoised because it is a fresh array every render otherwise, which would
  // defeat every downstream useMemo that depends on it.
  const nuisanceAxes = useMemo(
    () => (data ? data.axisNames.slice(1) : []),
    [data],
  );
  const axisGroups = useMemo(() => groupAxes(nuisanceAxes), [nuisanceAxes]);

  const band: BandPoint[] = useMemo(
    () => (data ? reduceBand(data, VARIABLE, selection) : []),
    [data, selection],
  );

  const nCells = data ? selectionSize(data, selection) : 0;
  const nMissing = band.reduce((acc, p) => acc + p.nMissing, 0);
  const provisional = Boolean(data && !data.manifest.coverage.complete);

  // Name the outstanding cases when there are few enough to be worth reading.
  // Past a handful the list stops informing and the count is the whole story.
  const missingLabels = useMemo(() => {
    const paths = data?.manifest.coverage.missing_case_paths ?? [];
    if (paths.length === 0 || paths.length > 3) return [];
    return paths.map((path) =>
      path
        .split("/")
        .map((part) => {
          const [axis, raw] = part.split("=");
          const value = Number(raw);
          return `${AXIS_SHORT[axis] ?? axis} ${
            Number.isFinite(value) ? formatAxisValue(axis, value) : raw
          }`;
        })
        .join(", "),
    );
  }, [data]);
  const emptySelection = nuisanceAxes.some(
    (name) => (selection[name]?.length ?? 0) === 0,
  );

  const visiblePoints = useMemo(
    () => MEASURED_ROWS.filter((p) => shownPoints.has(p.id)),
    [shownPoints],
  );

  // FIXED axes, deliberately not fitted to what is on screen.
  //
  // Fitting them to the current band made two selections silently
  // incomparable: fixing a parameter shrinks the envelope, the axes shrank
  // with it, and the band looked much the same width as before. The whole
  // point of the page is comparing band widths, so the frame has to hold
  // still while the contents change.
  //
  // Built from the whole cube plus every measured point INCLUDING the ones
  // currently toggled off, so no control on the page can move a datum outside
  // the view. Rounded out to decade boundaries, which is also where the ticks
  // are.
  const domains = useMemo(() => {
    if (!data) return null;
    const outerValues = data.manifest.axes[data.axisNames[0]] ?? [];
    const cubeExtent = variableExtent(data, VARIABLE);
    if (outerValues.length === 0 || !cubeExtent) return null;

    const xs = [
      ...outerValues,
      ...MEASURED.flatMap((p) => [p.xLo ?? p.x, p.xHi ?? p.x]),
    ].filter((v) => Number.isFinite(v) && v > 0);
    const ys = [
      ...cubeExtent,
      ...MEASURED.flatMap((p) => [p.yLo ?? p.y, p.yHi ?? p.y]),
    ].filter((v) => Number.isFinite(v) && v > 0);

    const xLo = Math.pow(10, Math.floor(Math.log10(Math.min(...xs))));
    const xHi = Math.pow(10, Math.ceil(Math.log10(Math.max(...xs))));
    const yLo = Math.pow(10, Math.floor(Math.log10(Math.min(...ys))));
    const yHi = Math.pow(10, Math.ceil(Math.log10(Math.max(...ys))));
    return { x: [xLo, xHi] as [number, number], y: [yLo, yHi] as [number, number] };
  }, [data]);

  // The 1:1 reference, AEI(ice) = EI(soot): every emitted soot particle ends up
  // an ice crystal, the ceiling the soot-driven part of the model works towards.
  //
  // Clipped analytically to the intersection of the two domains rather than
  // drawn across the full x range and left to overflow the plot area, and given
  // its own two-point dataset so both ends land exactly on the frame instead of
  // on the nearest soot grid value.
  const unitySegment = useMemo(() => {
    if (!domains) return [];
    const lo = Math.max(domains.x[0], domains.y[0]);
    const hi = Math.min(domains.x[1], domains.y[1]);
    return lo < hi ? [{ x: lo, unity: lo }, { x: hi, unity: hi }] : [];
  }, [domains]);

  /**
   * Move one knob, keeping knobs[0] strictly below knobs[1] by at least one
   * detent. Each knob is blocked at its neighbour rather than pushing it, so
   * dragging never silently moves the bound the reader did not grab.
   *
   * The one-detent floor is also what makes non-crossing safe: knobs that can
   * meet would stack, and the one underneath could no longer be grabbed. A
   * range therefore always spans at least two values; committing to a single
   * one is what fix mode is for.
   */
  const setKnob = useCallback(
    (axis: string, which: 0 | 1, index: number) => {
      if (!data) return;
      const n = data.manifest.axes[axis].length;
      const gap = Math.min(1, n - 1);
      setKnobs((prev) => {
        const [lo, hi] = prev[axis] ?? [0, n - 1];
        const next: Span =
          which === 0
            ? [Math.max(0, Math.min(index, hi - gap)), hi]
            : [lo, Math.min(n - 1, Math.max(index, lo + gap))];
        setSelection((sel) => ({ ...sel, [axis]: spanIndices(next) }));
        return { ...prev, [axis]: next };
      });
    },
    [data],
  );

  /** Widen a range-mode axis back to every value. */
  const setAll = useCallback(
    (axis: string) => {
      if (!data) return;
      const n = data.manifest.axes[axis].length;
      setKnobs((prev) => ({ ...prev, [axis]: [0, n - 1] }));
      setSelection((prev) => ({
        ...prev,
        [axis]: spanIndices([0, n - 1]),
      }));
    },
    [data],
  );

  /** Move a detented slider: the selection becomes exactly that grid value. */
  const setFixedIndex = useCallback((axis: string, index: number) => {
    setSelection((prev) => ({ ...prev, [axis]: [index] }));
    setKnobs((prev) => ({ ...prev, [axis]: [index, index] }));
  }, []);

  const setMode = useCallback(
    (axis: string, mode: AxisMode) => {
      if (!data) return;
      const n = data.manifest.axes[axis].length;
      setSelection((prev) => {
        const current = prev[axis] ?? [];
        if (mode === "fix") {
          rangeMemory.current[axis] = spanOf(current, n);
          // Land somewhere the reader can defend: what they already had if it
          // is a single value, otherwise the model default if the span covers
          // it, otherwise the low end of the span.
          const baseline = data.manifest.axis_baseline?.[axis]?.index ?? null;
          const index =
            current.length === 1
              ? current[0]
              : baseline !== null && current.includes(baseline)
                ? baseline
                : (current[0] ?? baseline ?? 0);
          setKnobs((k) => ({ ...k, [axis]: [index, index] }));
          return { ...prev, [axis]: [index] };
        }
        const remembered = rangeMemory.current[axis];
        const span: Span =
          remembered && remembered[0] !== remembered[1] ? remembered : [0, n - 1];
        setKnobs((k) => ({ ...k, [axis]: span }));
        return { ...prev, [axis]: spanIndices(span) };
      });
      setModes((prev) => ({ ...prev, [axis]: mode }));
    },
    [data],
  );

  function resetAll() {
    if (!data) return;
    const next: Selection = {};
    const nextModes: Record<string, AxisMode> = {};
    const nextKnobs: Record<string, Span> = {};
    for (const name of nuisanceAxes) {
      const n = data.manifest.axes[name].length;
      next[name] = spanIndices([0, n - 1]);
      nextModes[name] = "range";
      nextKnobs[name] = [0, n - 1];
    }
    setSelection(next);
    setModes(nextModes);
    setKnobs(nextKnobs);
  }

  function togglePoint(id: string) {
    setShownPoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAllPoints(all: boolean) {
    setShownPoints(all ? new Set(MEASURED.map((p) => p.id)) : new Set());
  }

  function pinToBaseline() {
    if (!data) return;
    const next: Selection = {};
    const nextModes: Record<string, AxisMode> = {};
    const nextKnobs: Record<string, Span> = {};
    for (const name of nuisanceAxes) {
      const baseline = data.manifest.axis_baseline?.[name];
      const pinned = baseline && baseline.index !== null;
      const n = data.manifest.axes[name].length;
      if (pinned) {
        const i = baseline.index as number;
        next[name] = [i];
        nextKnobs[name] = [i, i];
      } else {
        next[name] = spanIndices([0, n - 1]);
        nextKnobs[name] = [0, n - 1];
      }
      // An axis with no baseline on the grid stays free, rather than parking a
      // fixed knob on an arbitrary value.
      nextModes[name] = pinned ? "fix" : "range";
    }
    setSelection(next);
    setModes(nextModes);
    setKnobs(nextKnobs);
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

  // Only campaigns with at least one point still selected get a series, so an
  // entirely deselected campaign leaves no orphaned legend entry behind.
  const campaignsShown = CAMPAIGN_ORDER.filter((campaign) =>
    visiblePoints.some((p) => p.campaign === campaign),
  );

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
      />

      {/* Full width rather than inside a Section: the controls have to sit
          beside the plot, not under it, or you cannot see what a toggle did. */}
      <div className="editorial-rule border-t py-8">
        <div className="space-y-4">
          {provisional ? (
            <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              <span className="font-medium text-[var(--accent-deep)]">
                Provisional band.
              </span>{" "}
              {data.manifest.coverage.n_missing.toLocaleString()} of{" "}
              {data.manifest.coverage.n_cases.toLocaleString()} grid cases{" "}
              {data.manifest.coverage.n_missing === 1 ? "has" : "have"} not
              finished and {data.manifest.coverage.n_missing === 1 ? "is" : "are"}{" "}
              skipped rather than interpolated, so the band is a lower bound on
              its true width — it can only widen as {""}
              {data.manifest.coverage.n_missing === 1 ? "it lands" : "they land"}
              .
              {/* Named outright when there are only a few: at that point the
                  useful thing is which corner of the grid is absent, not a
                  percentage that rounds to 100. */}
              {missingLabels.length > 0 ? (
                <>
                  {" "}
                  Outstanding:{" "}
                  {missingLabels.map((label, i) => (
                    <span key={label}>
                      {i > 0 ? "; " : ""}
                      <code className="text-xs text-[var(--accent-deep)]">
                        {label}
                      </code>
                    </span>
                  ))}
                  .
                </>
              ) : null}
            </div>
          ) : null}

          {emptySelection ? (
            <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              At least one parameter has no value selected, so there is nothing
              to reduce over. Select a value, or use <em>Free everything</em>.
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {/* ---------------- parameters, left ---------------- */}
            <aside className="lg:w-[15rem] lg:shrink-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                  Parameters
                </h3>
                <span className="text-[0.68rem] tabular-nums text-[var(--muted)]">
                  {nCells.toLocaleString()} runs
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[0.68rem] text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Free all
                </button>
                <button
                  type="button"
                  onClick={pinToBaseline}
                  className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[0.68rem] text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Pin to defaults
                </button>
              </div>

              <div className="mt-3 space-y-3.5">
                {axisGroups.map((group) => (
                  <div key={group.title}>
                    <div className="px-0.5 pb-1">
                      <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                        {group.title}
                      </span>
                      <p className="text-[0.6rem] leading-snug text-[var(--muted)] opacity-80">
                        {group.note}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.axes.map((axis) => (
                        <AxisCard
                          key={axis}
                          axis={axis}
                          values={data.manifest.axes[axis]}
                          chosen={selection[axis] ?? []}
                          baselineIndex={
                            data.manifest.axis_baseline?.[axis]?.index ?? null
                          }
                          mode={modes[axis] ?? "range"}
                          knobs={
                            knobs[axis] ?? [
                              0,
                              data.manifest.axes[axis].length - 1,
                            ]
                          }
                          onSetAll={setAll}
                          onModeChange={setMode}
                          onFixIndex={setFixedIndex}
                          onKnob={setKnob}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[0.62rem] leading-snug text-[var(--muted)]">
                ★ is the model&rsquo;s own default. <b>range</b> shades the band
                over every value between its two knobs, which stay at least one
                step apart; <b>fix</b> commits the parameter to a single value.
                EI(soot) is the x-axis and is never fixed.
              </p>
              <p className="mt-1 text-[0.62rem] leading-snug text-[var(--muted)]">
                The fix slider steps between computed values and will not stop
                between them. Every value drawn is a case pyEPM actually ran.
              </p>
            </aside>

            {/* ---------------- plot, centre ---------------- */}
            <div className="min-w-0 flex-1">
              <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                <ResponsiveContainer width="100%" height={440}>
                  <ComposedChart
                    data={band}
                    margin={{ top: 12, right: 16, bottom: 44, left: 12 }}
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
                      allowDataOverflow
                      label={<XAxisTitle />}
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
                      allowDataOverflow
                      label={<YAxisTitle />}
                    />
                    <Tooltip
                      content={<BandTooltip nCells={nCells} />}
                      cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="left"
                      height={30}
                      wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
                    />

                    {/* Drawn first so the band and the measurements sit on top
                        of it: it is a reference, not a result. Its own
                        two-point dataset, so the ends land on the frame. */}
                    <Line
                      name="AEI(ice) = EI(soot)"
                      data={unitySegment}
                      dataKey="unity"
                      type="linear"
                      stroke="var(--muted)"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      strokeOpacity={0.75}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="plainline"
                    />

                    {/* A range Area takes [lo, hi] per row, which keeps both
                        endpoints positive and therefore plottable on a log
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
                    {campaignsShown.map((campaign) => (
                      <Scatter
                        key={campaign}
                        name={campaign}
                        data={visiblePoints.filter(
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
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  Band = min/max over {nCells.toLocaleString()} parameter
                  combination{nCells === 1 ? "" : "s"} at each soot value
                  {nMissing > 0
                    ? `, of which ${nMissing.toLocaleString()} are still running and were skipped`
                    : ""}
                  . This is a <em>range</em>, not a confidence interval — see
                  below.
                </p>
              </div>
            </div>

            {/* ---------------- measurements, right ---------------- */}
            <aside className="lg:w-[16.5rem] lg:shrink-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                  Measurements
                </h3>
                <span className="text-[0.68rem] tabular-nums text-[var(--muted)]">
                  {visiblePoints.length}/{MEASURED.length}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllPoints(true)}
                  className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[0.68rem] text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setAllPoints(false)}
                  className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[0.68rem] text-[var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent-deep)]"
                >
                  Hide all
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {CAMPAIGN_ORDER.map((campaign) => {
                  const points = MEASURED.filter(
                    (p) => p.campaign === campaign,
                  );
                  if (points.length === 0) return null;
                  return (
                    <div key={campaign}>
                      <div className="flex items-center gap-1.5 px-0.5 pb-1">
                        <MarkerGlyph campaign={campaign} />
                        <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                          {campaign}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {points.map((p) => {
                          const on = shownPoints.has(p.id);
                          const color = CAMPAIGN_STYLE[p.campaign].color;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => togglePoint(p.id)}
                              aria-pressed={on}
                              className={[
                                "w-full rounded-lg border px-2.5 py-1.5 text-left transition",
                                on
                                  ? "border-[color:var(--line)] bg-[color:var(--surface-soft)]/70"
                                  : "border-dashed border-[color:var(--line)] bg-transparent opacity-55 hover:opacity-80",
                              ].join(" ")}
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  aria-hidden
                                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                  style={{
                                    background: on ? color : "transparent",
                                    border: `1.5px solid ${color}`,
                                    borderRadius:
                                      CAMPAIGN_STYLE[p.campaign].shape ===
                                      "circle"
                                        ? "9999px"
                                        : "2px",
                                  }}
                                />
                                <span className="text-[0.78rem] font-medium leading-tight text-[var(--accent-deep)]">
                                  {p.label}
                                </span>
                              </span>
                              <span className="mt-0.5 block pl-4 text-[0.63rem] leading-tight tabular-nums text-[var(--muted)]">
                                FSC {p.fsc} ppm · T {p.tAmb} K
                                <br />
                                EI(soot) {formatSci(p.x)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-[0.62rem] leading-snug text-[var(--muted)]">
                FSC and T are the conditions each flight was flown at, not swept
                quantities — they say where in the band&rsquo;s parameter space
                the point sits. Coordinates and bars are digitised; see below.
              </p>
            </aside>
          </div>
        </div>
      </div>

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
// One parameter's value chips
// ---------------------------------------------------------------------------

/** Detent marks under a slider, one per computed value. */
function Detents({
  count,
  activeFrom,
  activeTo,
}: {
  count: number;
  activeFrom: number;
  activeTo: number;
}) {
  return (
    <div className="flex justify-between px-[1px]" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={[
            "h-1.5 w-px",
            i >= activeFrom && i <= activeTo
              ? "bg-[color:var(--accent)]"
              : "bg-[color:var(--line)]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function AxisCard({
  axis,
  values,
  chosen,
  mode,
  knobs,
  baselineIndex,
  onSetAll,
  onModeChange,
  onFixIndex,
  onKnob,
}: {
  axis: string;
  values: number[];
  chosen: number[];
  mode: AxisMode;
  knobs: Span;
  baselineIndex: number | null;
  onSetAll: (axis: string) => void;
  onModeChange: (axis: string, mode: AxisMode) => void;
  onFixIndex: (axis: string, index: number) => void;
  onKnob: (axis: string, which: 0 | 1, index: number) => void;
}) {
  const isFree = chosen.length === values.length;
  const fixedIndex = chosen.length === 1 ? chosen[0] : 0;
  const label = AXIS_SHORT[axis] ?? axis;
  // setKnob keeps knobs[0] below knobs[1]; min/max is belt and braces so a bad
  // state renders a narrow span rather than an inverted one.
  const lo = Math.min(knobs[0], knobs[1]);
  const hi = Math.max(knobs[0], knobs[1]);
  // The thumb is 13px wide and native range inputs inset the thumb centre by
  // half of it at each end, so the shaded span has to be laid out in the same
  // coordinates or it drifts away from the knobs towards the ends.
  const frac = (i: number) => (values.length > 1 ? i / (values.length - 1) : 0);
  const spanLeft = `calc(${frac(lo)} * (100% - 13px) + 6.5px)`;
  const spanWidth = `calc(${frac(hi) - frac(lo)} * (100% - 13px))`;

  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)]/60 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.78rem] font-medium leading-tight text-[var(--accent-deep)]">
          {label}
        </span>
        <div
          role="group"
          aria-label={`${label} mode`}
          className="flex overflow-hidden rounded-full border border-[color:var(--line)]"
        >
          {(["fix", "range"] as AxisMode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => onModeChange(axis, m)}
              className={[
                "px-1.5 py-[0.1rem] text-[0.6rem] transition",
                mode === m
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--accent-deep)]",
              ].join(" ")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[0.62rem] leading-tight text-[var(--muted)]">
        {AXIS_UNIT[axis] ?? ""}
        {mode === "fix"
          ? " · fixed"
          : isFree
            ? " · free"
            : ` · ${chosen.length}/${values.length}`}
      </div>

      {mode === "fix" ? (
        <div className="mt-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.78rem] font-medium tabular-nums text-[var(--fg)]">
              {formatAxisValue(axis, values[fixedIndex])}
            </span>
            {baselineIndex === fixedIndex ? (
              <span className="text-[0.6rem] text-[var(--muted)]">★ default</span>
            ) : null}
          </div>
          {/* Same control as range mode, one knob instead of two, and with no
              filled portion behind it: a fill running from the left end to the
              thumb would read as "everything up to here", which is what range
              mode means and not what this does.

              Detents are evenly spaced by INDEX, not by value: this is an
              ordinal picker over the cases that were run, and spacing it by
              value would imply the gaps in between are available. */}
          <div className="knob-slider mt-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-[6.5px] right-[6.5px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color:var(--line)]"
            />
            <input
              type="range"
              min={0}
              max={values.length - 1}
              step={1}
              value={fixedIndex}
              onChange={(e) => onFixIndex(axis, Number(e.target.value))}
              aria-label={`${label}, ${values.length} computed values`}
              aria-valuetext={formatAxisValue(axis, values[fixedIndex])}
            />
          </div>
          <Detents
            count={values.length}
            activeFrom={fixedIndex}
            activeTo={fixedIndex}
          />
          <div
            className="flex justify-between text-[0.58rem] tabular-nums text-[var(--muted)]"
            aria-hidden
          >
            <span>{formatAxisValue(axis, values[0])}</span>
            <span>{formatAxisValue(axis, values[values.length - 1])}</span>
          </div>
        </div>
      ) : (
        <div className="mt-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.78rem] font-medium tabular-nums text-[var(--fg)]">
              {lo === hi
                ? formatAxisValue(axis, values[lo])
                : `${formatAxisValue(axis, values[lo])} – ${formatAxisValue(axis, values[hi])}`}
            </span>
            {!isFree ? (
              <button
                type="button"
                className="text-[0.6rem] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--accent)]"
                onClick={() => onSetAll(axis)}
              >
                full
              </button>
            ) : baselineIndex !== null ? (
              <span className="text-[0.6rem] text-[var(--muted)]">
                ★ {formatAxisValue(axis, values[baselineIndex])}
              </span>
            ) : null}
          </div>

          <div className="knob-slider mt-1">
            {/* Rail and shaded span, drawn under both inputs. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-[6.5px] right-[6.5px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color:var(--line)]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color:var(--accent)]"
              style={{ left: spanLeft, width: spanWidth }}
            />
            {([0, 1] as const).map((which) => (
              <input
                key={which}
                type="range"
                min={0}
                max={values.length - 1}
                step={1}
                value={knobs[which]}
                onChange={(e) => onKnob(axis, which, Number(e.target.value))}
                aria-label={`${label} ${
                  which === 0 ? "lower bound" : "upper bound"
                }, ${values.length} computed values`}
                aria-valuetext={formatAxisValue(axis, values[knobs[which]])}
                style={{ zIndex: which + 1 }}
              />
            ))}
          </div>
          <Detents count={values.length} activeFrom={lo} activeTo={hi} />
          <div
            className="flex justify-between text-[0.58rem] tabular-nums text-[var(--muted)]"
            aria-hidden
          >
            <span>{formatAxisValue(axis, values[0])}</span>
            <span>{formatAxisValue(axis, values[values.length - 1])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign marker glyph
// ---------------------------------------------------------------------------
// Mirrors the marker Recharts draws for each campaign's Scatter, so the list on
// the right reads as the same encoding as the plot rather than as a legend that
// happens to share a colour.

function MarkerGlyph({ campaign }: { campaign: CampaignName }) {
  const { color, shape } = CAMPAIGN_STYLE[campaign];
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      {shape === "circle" ? (
        <circle cx="5" cy="5" r="4" fill={color} />
      ) : shape === "triangle" ? (
        <polygon points="5,1 9,9 1,9" fill={color} />
      ) : (
        <rect x="1" y="1" width="8" height="8" fill={color} />
      )}
    </svg>
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
        <div className="font-medium text-[var(--accent-deep)]">
          {p.campaign} — {p.label}
        </div>
        <div className="mt-1 text-[var(--muted)]">
          FSC {p.fsc} ppm · T_amb {p.tAmb} K
        </div>
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
