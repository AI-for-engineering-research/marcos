"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Section } from "@/components/section";
import {
  type Mode,
  type SliderState,
  type SweepData,
  loadSweep,
  pSatH2OlPa,
  pSatH2OsPa,
  timeSeries,
} from "@/lib/sweep-data";

// ---------------------------------------------------------------------------
// Visual constants chosen to mirror notebooks/plotting.py:mixingLine()
// and notebooks/plotting.py:time_series_ice() in the pyEPM repo.
// ---------------------------------------------------------------------------

const MIXING_X_MIN = 210;
const MIXING_X_MAX = 260;
const MIXING_Y_MIN = 0;
const MIXING_Y_MAX = 0.8; // hPa, matches plotting.py:471
const PLOT_HEIGHT_PX = 230;

const ICE_TRACES: { name: string; varName: string; color: string; dashed?: boolean }[] = [
  // Convention: same hue per aerosol mode, ice variant = dashed.
  // Colors chosen to be readable on both light and dark backgrounds
  // (replace the previous black / darkblue / gray which disappeared on dark theme).
  { name: "Bare soot", varName: "total_soot_per_kgfuel", color: "#ef4444" },         // red-500
  { name: "Sulfur aerosol", varName: "total_liquid_aerosol_per_kgfuel", color: "#3b82f6" }, // blue-500
  { name: "Ambient aerosol", varName: "total_ambient_aerosol_per_kgfuel", color: "#f59e0b" }, // amber-500
  { name: "Soot ice", varName: "soot_ice_per_kgfuel", color: "#ef4444", dashed: true },
  { name: "Sulfur ice", varName: "sulfur_ice_per_kgfuel", color: "#3b82f6", dashed: true },
  { name: "Ambient ice", varName: "ambient_ice_per_kgfuel", color: "#f59e0b", dashed: true },
];

// Saturation curves are static; precompute once.
const SAT_CURVE = (() => {
  const out: { T: number; liquid_hPa: number; ice_hPa: number }[] = [];
  const N = 200;
  for (let i = 0; i < N; i++) {
    const T = 200 + (300 - 200) * (i / (N - 1));
    out.push({
      T,
      liquid_hPa: pSatH2OlPa(T) / 100,
      ice_hPa: pSatH2OsPa(T) / 100,
    });
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Slider helpers
// ---------------------------------------------------------------------------

type AxisRange = { min: number; max: number };

function logSliderToValue(sliderUnit: number, range: AxisRange): number {
  // sliderUnit in [0, 1].
  const lo = Math.log10(range.min);
  const hi = Math.log10(range.max);
  return Math.pow(10, lo + (hi - lo) * sliderUnit);
}
function valueToLogSlider(value: number, range: AxisRange): number {
  const lo = Math.log10(range.min);
  const hi = Math.log10(range.max);
  return (Math.log10(value) - lo) / (hi - lo);
}
function linSliderToValue(sliderUnit: number, range: AxisRange): number {
  return range.min + (range.max - range.min) * sliderUnit;
}
function valueToLinSlider(value: number, range: AxisRange): number {
  return (value - range.min) / (range.max - range.min);
}

function fmtSci(x: number): string {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  return `${m.toFixed(2)}×10^${e}`;
}

// Unicode superscript digits, used to render axis ticks like "10¹⁵" inline
// inside SVG <text>. This is the closest you can get to a LaTeX-rendered
// 10^{15} without dragging KaTeX into the chart engine.
const _SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function toSuperscript(n: number): string {
  if (!Number.isInteger(n)) n = Math.round(n);
  if (n < 0) {
    return "⁻" + toSuperscript(-n);
  }
  return n
    .toString()
    .split("")
    .map((d) => _SUPERSCRIPTS[Number(d)])
    .join("");
}

/** Format a positive value as 10^N using Unicode superscripts. */
function formatPow10(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "";
  const e = Math.round(Math.log10(v));
  return `10${toSuperscript(e)}`;
}

/** Format as a coefficient times a power of ten, e.g. 1.50 × 10¹⁴. */
function formatSciSup(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / Math.pow(10, e);
  return `${m.toFixed(2)} × 10${toSuperscript(e)}`;
}

function fmtCompact(x: number): string {
  if (!Number.isFinite(x)) return "";
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  if (Math.abs(x) >= 10) return x.toFixed(1).replace(/\.0$/, "");
  return x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SensitivityDashboard() {
  const [data, setData] = useState<SweepData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("interp");

  // Slider state (typed values, not unit floats).
  const [sliders, setSliders] = useState<SliderState>({
    fsc: 60.0,
    soot: 1.0e14,
    tAmb: 218.0,
    n0: 60.0,
  });

  useEffect(() => {
    let cancelled = false;
    loadSweep()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Initialize sliders to manifest midpoints to avoid landing outside the grid.
        const ax = d.manifest.axes;
        setSliders({
          fsc: Math.sqrt(ax.fsc_ppm[0] * ax.fsc_ppm[ax.fsc_ppm.length - 1]),
          soot: Math.sqrt(
            ax.soot_per_kgfuel[0] * ax.soot_per_kgfuel[ax.soot_per_kgfuel.length - 1],
          ),
          tAmb:
            (ax.temperature_amb_K[0] +
              ax.temperature_amb_K[ax.temperature_amb_K.length - 1]) /
            2,
          n0:
            (ax.n0_kg_air_per_kg_fuel[0] +
              ax.n0_kg_air_per_kg_fuel[ax.n0_kg_air_per_kg_fuel.length - 1]) /
            2,
        });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ranges = useMemo(() => {
    if (!data) return null;
    const ax = data.manifest.axes;
    return {
      fsc: { min: ax.fsc_ppm[0], max: ax.fsc_ppm[ax.fsc_ppm.length - 1] },
      soot: {
        min: ax.soot_per_kgfuel[0],
        max: ax.soot_per_kgfuel[ax.soot_per_kgfuel.length - 1],
      },
      tAmb: {
        min: ax.temperature_amb_K[0],
        max: ax.temperature_amb_K[ax.temperature_amb_K.length - 1],
      },
      n0: {
        min: ax.n0_kg_air_per_kg_fuel[0],
        max: ax.n0_kg_air_per_kg_fuel[ax.n0_kg_air_per_kg_fuel.length - 1],
      },
    };
  }, [data]);

  // Build chart data on every slider/mode change.
  const charts = useMemo(() => {
    if (!data) return null;
    const t = data.manifest.axes.time_s;
    const T = timeSeries(data, "temperature", sliders, mode);
    const RHl = timeSeries(data, "RHl", sliders, mode);

    // Reproduce notebooks/plotting.py:mixingLine() exactly:
    //   y = states.RHl * pSat_H2Ol(T) / 100
    // pSat_H2Ol is in Pa, /100 converts Pa -> hPa. In pyEPM ivp.py:65,
    //   states['RHl'] = states.xH2O * pressure / pSat_H2Ol(temperature)
    // i.e. RHl is a fraction (1.0 = 100% RH). So the partial pressure in hPa is
    //   p_H2O_hPa = RHl * pSat_H2Ol(T) [Pa] / 100
    const mixing = Array.from(T, (Tk, i) => ({
      T: Tk,
      pH2O_hPa: (RHl[i] * pSatH2OlPa(Tk)) / 100,
    }));

    const ice: Record<string, Float32Array> = {};
    for (const tr of ICE_TRACES) {
      ice[tr.varName] = timeSeries(data, tr.varName, sliders, mode);
    }
    const iceRows = t.map((tk, i) => {
      const row: Record<string, number> = { t: tk };
      for (const tr of ICE_TRACES) {
        const v = ice[tr.varName][i];
        // Recharts log scale cannot plot 0 or negatives; coerce to NaN to leave a gap.
        row[tr.varName] = v > 0 ? v : NaN;
      }
      return row;
    });

    return { mixing, iceRows };
  }, [data, sliders, mode]);

  if (error) {
    return (
      <Section eyebrow="Sensitivity" title="Interactive parameter sweep">
        <div className="rounded-2xl border border-red-300 bg-red-50/60 p-5 text-sm leading-7 text-red-900 dark:border-red-400/40 dark:bg-red-900/20 dark:text-red-100">
          <p className="font-semibold">Failed to load the precomputed sweep.</p>
          <p className="mt-2 break-words">{error}</p>
          <p className="mt-3">
            The dashboard expects <code>public/data/sweep_v1.json</code> and{" "}
            <code>public/data/sweep_v1.bin</code>. Run{" "}
            <code>pyepm-sweep4d -i epm-only-input.yaml -o data --copy-to /path/to/marcos/public/data</code>{" "}
            from the pyEPM repo.
          </p>
        </div>
      </Section>
    );
  }

  if (!data || !ranges || !charts) {
    return (
      <Section eyebrow="Sensitivity" title="Interactive parameter sweep">
        <p className="text-sm text-[var(--muted)]">Loading precomputed sweep data…</p>
      </Section>
    );
  }

  const m = data.manifest;

  return (
    <div className="flex flex-col gap-8">
      <Section
        eyebrow="Sensitivity"
        title="Interactive parameter sweep"
        description="Move the sliders to explore how the early-plume mixing line and the ice / aerosol time series respond to engine exhaust and ambient conditions."
      >
        <div className="rounded-2xl bg-[var(--surface)] p-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Lookup mode
            </p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "interp"}
                onChange={() => setMode("interp")}
              />
              <span>Interpolate</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "snap"}
                onChange={() => setMode("snap")}
              />
              <span>Snap</span>
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Interpolation is multilinear in log10(FSC), log10(EI soot), T<sub>amb</sub>, and N₀.
            Use “snap” to read raw pyEPM solves at the marked grid points.
          </p>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 rounded-3xl border border-black/8 bg-white/80 p-5 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5">
            <div className="grid gap-4">
              <SliderRow
                label="FSC"
                units="ppm"
                valueLabel={fmtCompact(sliders.fsc)}
                sliderUnit={valueToLogSlider(sliders.fsc, ranges.fsc)}
                onSliderUnit={(u) =>
                  setSliders((s) => ({ ...s, fsc: logSliderToValue(u, ranges.fsc) }))
                }
                rangeMin={ranges.fsc.min}
                rangeMax={ranges.fsc.max}
                gridValues={m.axes.fsc_ppm}
                logScale
                endpointFormatter={fmtCompact}
              />
              <SliderRow
                label="EI soot"
                units="# / kg-fuel"
                valueLabel={formatSciSup(sliders.soot)}
                sliderUnit={valueToLogSlider(sliders.soot, ranges.soot)}
                onSliderUnit={(u) =>
                  setSliders((s) => ({ ...s, soot: logSliderToValue(u, ranges.soot) }))
                }
                rangeMin={ranges.soot.min}
                rangeMax={ranges.soot.max}
                gridValues={m.axes.soot_per_kgfuel}
                logScale
                endpointFormatter={formatPow10}
              />
              <SliderRow
                label="Ambient temperature"
                units="K"
                valueLabel={sliders.tAmb.toFixed(1)}
                sliderUnit={valueToLinSlider(sliders.tAmb, ranges.tAmb)}
                onSliderUnit={(u) =>
                  setSliders((s) => ({ ...s, tAmb: linSliderToValue(u, ranges.tAmb) }))
                }
                rangeMin={ranges.tAmb.min}
                rangeMax={ranges.tAmb.max}
                gridValues={m.axes.temperature_amb_K}
                endpointFormatter={(v) => fmtCompact(v)}
              />
              <SliderRow
                label="Initial dilution N₀"
                units="kg-air / kg-fuel"
                valueLabel={sliders.n0.toFixed(1)}
                sliderUnit={valueToLinSlider(sliders.n0, ranges.n0)}
                onSliderUnit={(u) =>
                  setSliders((s) => ({ ...s, n0: linSliderToValue(u, ranges.n0) }))
                }
                rangeMin={ranges.n0.min}
                rangeMax={ranges.n0.max}
                gridValues={m.axes.n0_kg_air_per_kg_fuel}
                endpointFormatter={(v) => fmtCompact(v)}
              />
            </div>
          </div>
        </div>

        <ChartCard title="Interactive outputs" className="h-full">
          <div className="grid h-full gap-5">
            <div>
              <h4 className="mb-2 text-sm font-semibold tracking-tight">Mixing line</h4>
              <ResponsiveContainer width="100%" height={PLOT_HEIGHT_PX}>
            <LineChart margin={{ top: 12, right: 16, bottom: 32, left: 48 }}>
              <CartesianGrid stroke="rgba(127,127,127,0.25)" />
              <XAxis
                type="number"
                dataKey="T"
                domain={[MIXING_X_MIN, MIXING_X_MAX]}
                allowDataOverflow
                tickCount={6}
                tick={{ fontSize: 10 }}
                label={{
                  value: "Temperature [K]",
                  position: "insideBottom",
                  offset: -16,
                  style: { fontSize: 11, textAnchor: "middle" },
                }}
              />
              <YAxis
                type="number"
                domain={[MIXING_Y_MIN, MIXING_Y_MAX]}
                allowDataOverflow
                tick={{ fontSize: 10 }}
                label={{
                  value: "Water vapor partial pressure [hPa]",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, textAnchor: "middle" },
                }}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  Number.isFinite(Number(v)) ? Number(v).toFixed(4) : "—",
                  String(name),
                ]}
                labelFormatter={(t: unknown) => `T = ${Number(t).toFixed(2)} K`}
              />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />
              <Line
                data={SAT_CURVE}
                dataKey="ice_hPa"
                name="Ice saturation"
                stroke="#7d7d7d"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                xAxisId={0}
              />
              <Line
                data={SAT_CURVE}
                dataKey="liquid_hPa"
                name="Liquid saturation"
                stroke="#7d7d7d"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                xAxisId={0}
              />
              <Line
                data={charts.mixing}
                dataKey="pH2O_hPa"
                name="Mixing line"
                stroke="#1f4ed8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                xAxisId={0}
              />
            </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold tracking-tight">Particle / ice time series</h4>
              <ResponsiveContainer width="100%" height={PLOT_HEIGHT_PX}>
            <LineChart data={charts.iceRows} margin={{ top: 12, right: 16, bottom: 32, left: 48 }}>
              <CartesianGrid stroke="rgba(127,127,127,0.25)" />
              <XAxis
                type="number"
                dataKey="t"
                scale="linear"
                domain={[0, 1]}
                ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                allowDataOverflow
                tick={{ fontSize: 10 }}
                tickFormatter={(v: unknown) => Number(v).toFixed(1)}
                label={{
                  value: "Time [s]",
                  position: "insideBottom",
                  offset: -16,
                  style: { fontSize: 11, textAnchor: "middle" },
                }}
              />
              <YAxis
                type="number"
                scale="log"
                domain={[1e9, 1e17]}
                ticks={[1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e16, 1e17]}
                allowDataOverflow
                tick={{ fontSize: 10 }}
                tickFormatter={(v: unknown) => formatPow10(Number(v))}
                label={{
                  value: "Particles per kg-fuel",
                  angle: -90,
                  position: "insideLeft",
                  offset: 4,
                  style: { fontSize: 11, textAnchor: "middle" },
                }}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  Number.isFinite(Number(v)) ? fmtSci(Number(v)) : "—",
                  String(name),
                ]}
                labelFormatter={(t: unknown) => `t = ${Number(t).toFixed(3)} s`}
              />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />
              {ICE_TRACES.map((tr) => (
                <Line
                  key={tr.varName}
                  type="monotone"
                  dataKey={tr.varName}
                  name={tr.name}
                  stroke={tr.color}
                  strokeWidth={2.2}
                  strokeDasharray={tr.dashed ? "6 4" : undefined}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>
      </div>

      <Section eyebrow="Provenance" title="Frozen parameters and sweep manifest">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface)] p-5 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Frozen during this sweep</h3>
            <dl className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6">
              <Fact label="T_c0 (engine exit)" value={`${m.frozen_parameters.engine_exit.Tc0_K} K`} />
              <Fact label="Pressure" value={`${(m.frozen_parameters.ambient.pressure_Pa / 100).toFixed(2)} hPa`} />
              <Fact label="RH_i (initial)" value={`${(m.frozen_parameters.ambient.RHi_init * 100).toFixed(1)} %`} />
              <Fact label="Ambient SO₄" value={`${(m.frozen_parameters.ambient.background_SO4_mole_fraction * 1e12).toFixed(2)} ppt`} />
              <Fact label="Ambient aerosol" value={`${m.frozen_parameters.ambient.ambient_aerosol_per_cm3} cm⁻³`} />
              <Fact label="EI(H₂O)" value={`${m.frozen_parameters.emissions.EI_H2O_kg_per_kg_fuel} kg/kg-fuel`} />
              <Fact label="EI(ions)" value={fmtSci(m.frozen_parameters.emissions.EI_ions_per_kg_fuel) + " /kg-fuel"} />
              <Fact label="Sulfur vPM" value={fmtSci(m.frozen_parameters.emissions.sulfur_vPM_per_kg_fuel) + " /kg-fuel"} />
              <Fact label="SO₂→SO₄" value={`${(m.frozen_parameters.emissions.SO2_to_SO4_fraction * 100).toFixed(2)} %`} />
              <Fact label="Soot GMD / GSD / κ" value={`${(m.frozen_parameters.aerosols.soot_GMD_m * 1e9).toFixed(1)} nm / ${m.frozen_parameters.aerosols.soot_GSD} / ${m.frozen_parameters.aerosols.soot_kappa}`} />
              <Fact label="Ambient GMD / GSD / κ" value={`${(m.frozen_parameters.aerosols.ambient_GMD_m * 1e9).toFixed(1)} nm / ${m.frozen_parameters.aerosols.ambient_GSD} / ${m.frozen_parameters.aerosols.ambient_kappa}`} />
              <Fact label="Sulfur GSD / κ" value={`${m.frozen_parameters.aerosols.sulfur_GSD} / ${m.frozen_parameters.aerosols.sulfur_kappa}`} />
              <Fact label="Sim time window" value={`${m.frozen_parameters.simulation.t_initial_s} – ${m.frozen_parameters.simulation.t_final_s} s`} />
            </dl>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-5 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Sweep provenance</h3>
            <dl className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-[max-content_1fr] sm:gap-x-4">
              <Fact label="Format" value={m.format} />
              <Fact label="Sweep label" value={m.sweep_label} />
              <Fact label="Generated" value={m.generated_utc} />
              <Fact label="pyEPM SHA" value={`${m.pyepm_git_sha.slice(0, 12)}${m.pyepm_git_dirty ? " (dirty)" : ""}`} />
              <Fact label="YAML SHA-256" value={m.input_yaml_sha256.slice(0, 16) + "…"} />
              <Fact label="Cube shape" value={`[${m.shape.join(", ")}]`} />
              <Fact label="Variables" value={m.variables.join(", ")} />
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Plot conventions reproduce <code>notebooks/plotting.py</code> in the pyEPM repo:{" "}
              <code>mixingLine()</code> and <code>time_series_ice()</code>.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  units,
  valueLabel,
  sliderUnit,
  onSliderUnit,
  rangeMin,
  rangeMax,
  gridValues,
  logScale = false,
  endpointFormatter,
}: {
  label: string;
  units: string;
  valueLabel: string;
  sliderUnit: number;
  onSliderUnit: (u: number) => void;
  rangeMin: number;
  rangeMax: number;
  gridValues: number[];
  logScale?: boolean;
  endpointFormatter: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">
          {label} <span className="font-normal text-[var(--muted)]">[{units}]</span>
        </span>
        <span className="font-mono text-base">{valueLabel}</span>
      </div>
      <input
        className="slider-lg mt-4"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={sliderUnit}
        onChange={(e) => onSliderUnit(parseFloat(e.target.value))}
      />
      {/* Tick marks at each grid node so the user can see snap positions. */}
      <div className="relative mt-1 h-3">
        {gridValues.map((g) => {
          let unit: number;
          if (logScale) {
            const lo = Math.log10(gridValues[0]);
            const hi = Math.log10(gridValues[gridValues.length - 1]);
            unit = (Math.log10(g) - lo) / (hi - lo);
          } else {
            const lo = gridValues[0];
            const hi = gridValues[gridValues.length - 1];
            unit = (g - lo) / (hi - lo);
          }
          return (
            <span
              key={g}
              className="absolute top-0 h-3 w-px bg-[var(--accent)]/50"
              style={{ left: `calc(${unit * 100}% - 0.5px)` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-start justify-between text-xs text-[var(--muted)]">
        <span className="max-w-[40%] text-left">{endpointFormatter(rangeMin)}</span>
        <span className="max-w-[40%] text-right">{endpointFormatter(rangeMax)}</span>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-black/8 bg-white/80 p-5 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5 ${className}`}>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </>
  );
}
