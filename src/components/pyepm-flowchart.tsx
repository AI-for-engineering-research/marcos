"use client";

import katex from "katex";
import { useMemo, useState } from "react";
import "katex/dist/katex.min.css";

type FlowStep = {
  id: string;
  phase: string;
  title: string;
  short: string;
  code: string[];
  inputs: string[];
  equations: string[];
  parameters: string[];
  outputs: string[];
  checks: string[];
};

const flowSteps: FlowStep[] = [
  {
    id: "yaml",
    phase: "Inputs",
    title: "1. Read the pyEPM case definition",
    short:
      "A YAML file defines the aircraft exhaust, aerosol, ambient meteorology, and simulation clock used for one plume trajectory.",
    code: ["epm-only-input.yaml", "pyepm/epm/parameters.py: Parameters"],
    inputs: [
      "Ambient: Tₐ, pₐ, RHi, background SO₄, ambient aerosol number.",
      "Emissions: exit temperature T₀, FSC, SO₂→SO₄ conversion, EI(H₂O), EI(soot), EI(ions), sulfur vPM, initial dilution N₀.",
      "Aerosols: soot/ambient/sulfur GMD, GSD, and hygroscopicity κ.",
      "Simulation: initial time, final time, and number of timesteps.",
    ],
    equations: [
      String.raw`\mathrm{RH}_w = \mathrm{RH}_i \, \frac{p_{\mathrm{sat},i}(T_a)}{p_{\mathrm{sat},l}(T_a)}`,
      String.raw`n_{\mathrm{air}}(T,p)=\frac{N_A p}{R T \, 10^6}\quad [\mathrm{molecules}\;\mathrm{cm}^{-3}]`,
    ],
    parameters: [
      "FSC [ppm]: fuel sulfur content controlling available sulfur mass.",
      "EIsoot [#/kg fuel]: emitted soot number available as ice nuclei or water competitors.",
      "Tₐ and RHi: determine whether the plume crosses water/ice supersaturation.",
    ],
    outputs: [
      "Structured parameter objects: ambient, emissions, aerosols_input, simulation, aircraft, engine_exit.",
    ],
    checks: [
      "Inputs must be traceable to the YAML file; do not silently change FSC, soot EI, humidity, or dilution assumptions.",
      "Ambient RHi/RHw consistency is critical because ice formation is saturation-controlled.",
    ],
  },
  {
    id: "initial-state",
    phase: "Initialization",
    title: "2. Convert emissions into initial plume concentrations",
    short:
      "Emission indices and dilution are converted to plume number densities and gas mixing ratios at the engine exit plane.",
    code: ["pyepm/epm/parameters.py: OdeInput", "pyepm/thermo/__init__.py"],
    inputs: [
      "Engine-exit temperature T₀ and ambient pressure pₐ.",
      "Initial dilution N₀ or engine mass-flow/area based dilution.",
      "EI(H₂O), EIsoot, EIions, FSC, SO₂→SO₄ conversion, sulfur vPM number.",
    ],
    equations: [
      String.raw`D_0=\frac{\rho_{\mathrm{air}}(T_0,p_a)\,10^{-6}}{N_0 N_{\mathrm{eng}}}\quad\text{(mass-based dilution)}`,
      String.raw`[\mathrm{H_2O}]_{\mathrm{eng}}=\mathrm{EI}_{\mathrm{H_2O}}\,\frac{N_A}{MW_{\mathrm{H_2O}}}\,D_0`,
      String.raw`[\mathrm{SO_4}]_{\mathrm{eng}}=f_{\mathrm{SO_2\to SO_4}}\left(\frac{\mathrm{FSC}}{5\times10^5}\right)\frac{N_A}{MW_{\mathrm{H_2SO_4}}}D_0`,
      String.raw`N_{\mathrm{soot}}=\mathrm{EI}_{\mathrm{soot}}D_0,\qquad N_{\mathrm{ions}}=\mathrm{EI}_{\mathrm{ions}}D_0`,
      String.raw`x_i=\frac{C_i}{n_{\mathrm{air}}(T_0,p_a)}`,
    ],
    parameters: [
      "N₀ [kg air/kg fuel]: sets how concentrated the initial plume is.",
      "N_eng: number of engines represented by the case.",
      "MW_H₂O, MW_H₂SO₄, N_A: convert kg fuel emission indices to molecular numbers.",
    ],
    outputs: [
      "Initial ODE state: tracer, T₀, xSoot, xH₂O, xSO₄g, xAmbient_aer, with liquid aerosol and ice initially zero.",
      "Initial sulfur aerosol size inferred from available sulfur mass and sulfur particle number.",
    ],
    checks: [
      "Initial concentrations should be positive and finite.",
      "The resulting H₂O mixing ratio should exceed ambient H₂O for a hot exhaust plume.",
    ],
  },
  {
    id: "distributions",
    phase: "Initialization",
    title: "3. Build aerosol and ice size grids",
    short:
      "Logarithmic bin grids represent sulfur clusters, soot, ambient aerosol, and final ice particle distributions.",
    code: ["pyepm/aerosols/constants.py: Distribution", "pyepm/aerosols/__init__.py: Microphysics.set_pdf"],
    inputs: [
      "Soot GMD/GSD and number concentration.",
      "Ambient aerosol GMD/GSD and number concentration.",
      "Sulfur molecular-scale bins plus larger H₂SO₄ particle bins.",
      "Ice radius grid from 10⁻⁸ to 10⁻⁴ m.",
    ],
    equations: [
      String.raw`\frac{dN}{d\ln r}=\frac{N}{\sqrt{2\pi}\ln\sigma_g}\exp\left[-\frac{1}{2}\left(\frac{\ln r-\ln r_g}{\ln\sigma_g}\right)^2\right]`,
      String.raw`N_{\mathrm{total}}\approx\sum_j pdf_j\,\Delta\ln r_j`,
      String.raw`V_j=\frac{4}{3}\pi r_j^3`,
    ],
    parameters: [
      "GMD: geometric mean diameter; radius grid uses GMD/2 as geometric mean radius.",
      "GSD σ_g: controls width of each lognormal mode.",
      "κ_soot, κ_amb, κ_vPM: hygroscopicity parameters used later by Köhler activation.",
    ],
    outputs: [
      "pdf arrays for soot, ambient aerosol, neutral H₂SO₄, positive ions, and negative ions.",
      "Empty ice PDFs that will receive frozen particle number during the microphysics loop.",
    ],
    checks: [
      "PDFs should integrate to the intended particle numbers.",
      "The sulfur grid must resolve molecular clusters if chemi-ion growth is being tested.",
    ],
  },
  {
    id: "entrainment",
    phase: "Plume dynamics",
    title: "4. Dilute and cool the plume with entrainment",
    short:
      "The ODE evolves bulk plume tracers toward ambient values using a time-dependent entrainment rate.",
    code: ["pyepm/epm/ode.py: EPM.__call__", "pyepm/physics/__init__.py: entrainRate_k15"],
    inputs: [
      "Current state y(t): tracer, T, xH₂O, xSoot, xSO₄g, xIce, aerosol tracers.",
      "Ambient targets: Tₐ, xH₂Oₐ, xSO₄gₐ, xAmbient_aerₐ.",
      "Kärcher-style entrainment parameterization.",
    ],
    equations: [
      String.raw`\omega(t)=\begin{cases}0,&t\le\tau\\0.9/t,&\tau<t\le t_1\\\omega_{\mathrm{vortex/dispersion}}(t),&t>t_1\end{cases}`,
      String.raw`\frac{dT}{dt}=-\omega(t)(T-T_a)`,
      String.raw`\frac{dx_{\mathrm{H_2O}}}{dt}=-\omega(t)\left(x_{\mathrm{H_2O}}-x_{\mathrm{H_2O},a}\right)`,
      String.raw`\frac{dx_{\mathrm{soot}}}{dt}=-\omega x_{\mathrm{soot}},\qquad \frac{dx_{\mathrm{ice}}}{dt}=-\omega x_{\mathrm{ice}}`,
    ],
    parameters: [
      "τ≈10 ms: no entrainment before the early-jet timescale in the current implementation.",
      "t₁,t₂: transition times between jet, vortex, and dispersion regimes.",
      "Tₐ: ambient temperature controlling cooling rate and saturation history.",
    ],
    outputs: [
      "Bulk plume state at the end of the timestep before microphysics correction.",
      "Entrainment factors used to dilute each particle distribution consistently.",
    ],
    checks: [
      "Hot exhaust should cool monotonically toward ambient unless another heat source is introduced.",
      "Tracer and emitted particle mixing ratios should dilute, not grow from dynamics alone.",
    ],
  },
  {
    id: "supersaturation",
    phase: "Thermodynamics",
    title: "5. Diagnose water and ice supersaturation",
    short:
      "The model converts water mixing ratio and temperature into saturation ratios that control activation, growth, and freezing.",
    code: ["pyepm/epm/ivp.py: derived states", "pyepm/thermo/__init__.py: pSat_H2Ol, pSat_H2Os"],
    inputs: [
      "Current T, pₐ, and xH₂O after plume dilution.",
      "Saturation vapor pressures over liquid water and ice.",
    ],
    equations: [
      String.raw`\mathrm{RH}_l=\frac{x_{\mathrm{H_2O}}p_a}{p_{\mathrm{sat},l}(T)}`,
      String.raw`\mathrm{RH}_i=\frac{x_{\mathrm{H_2O}}p_a}{p_{\mathrm{sat},i}(T)}`,
      String.raw`\mathrm{Ice\ supersaturation:}\quad \mathrm{RH}_i>1;\qquad \mathrm{activation:}\quad S_{amb}\ge S_{v,crit}`,
    ],
    parameters: [
      "p_sat,liq(T): liquid-water saturation vapor pressure.",
      "p_sat,ice(T): ice saturation vapor pressure.",
      "The cold ambient state can make RHi high even when RHw is below unity.",
    ],
    outputs: ["Time series of RHl and RHi; these are key diagnostics for any predicted ice event."],
    checks: [
      "Ice formation without a plausible supersaturation history should be flagged.",
      "Water vapor removal by condensation/deposition must feed back on xH₂O.",
    ],
  },
  {
    id: "sulfur-ions",
    phase: "Microphysics",
    title: "6. Grow H₂SO₄ particles and ion clusters",
    short:
      "Gas-phase sulfuric acid, neutral clusters, and charged clusters evolve through condensation, evaporation, and coagulation.",
    code: ["pyepm/aerosols/__init__.py: kinetic_growth_full_imn", "pyepm/aerosols/coagulation.py"],
    inputs: [
      "Gas H₂SO₄ concentration from xSO₄g n_air.",
      "Neutral, positive, and negative H₂SO₄ cluster PDFs.",
      "Temperature-dependent Brownian kernels and ion enhancement factors.",
    ],
    equations: [
      String.raw`\beta_{ij}=\beta^{\mathrm{Brownian}}_{ij}+\beta^{\mathrm{diff.\ enh.}}_{ij}`,
      String.raw`\beta^{\mathrm{charged}}_{ij}=E_{ij}(T,q_i,q_j,r_i,r_j)\,\beta_{ij}`,
      String.raw`\mathrm{cluster}_i+\mathrm{H_2SO_4}_{(g)}\rightarrow\mathrm{cluster}_{i+1}`,
      String.raw`V_i+V_j\rightarrow V_{ij},\qquad V_{ij}\text{ is remapped to adjacent bins}`,
    ],
    parameters: [
      "EIions: initializes positive and negative molecular ions.",
      "FSC and SO₂→SO₄ conversion: set the sulfur vapor reservoir.",
      "H₂SO₄ accommodation/evaporation assumptions influence sulfur aerosol survival.",
    ],
    outputs: [
      "Updated H₂SO₄ vapor and sulfur particle PDFs.",
      "Potential sulfur-only ice precursors and sulfur coatings for soot.",
    ],
    checks: [
      "Sulfur number and vapor should remain non-negative.",
      "Ion-enhanced growth can be numerically stiff; explosive growth requires physical/numerical review.",
    ],
  },
  {
    id: "soot-coating",
    phase: "Microphysics",
    title: "7. Coat soot and update soot hygroscopicity",
    short:
      "Sulfur aerosol coagulating with soot increases the effective soot κ, making soot easier to activate in water-supersaturated plume air.",
    code: ["pyepm/aerosols/__init__.py: update_kappa_soot"],
    inputs: [
      "Soot number distribution and wet/dry soot volume.",
      "H₂SO₄ particle distributions and SO₄–soot coagulation kernel.",
      "κ_soot and κ_vPM from the YAML aerosol submenu.",
    ],
    equations: [
      String.raw`\theta_i(t+\Delta t)=\theta_i(t)+\Delta t\sum_j K^{\mathrm{SO_4-soot}}_{ij}N^{\mathrm{SO_4}}_jV^{\mathrm{SO_4}}_j`,
      String.raw`\kappa_{\mathrm{soot,eff}}=\frac{V_{\mathrm{soot}}\kappa_{\mathrm{soot}}+\theta\kappa_{vPM}}{V_{\mathrm{soot}}+\theta}`,
    ],
    parameters: [
      "κ_soot≈hydrophobic initial soot value.",
      "κ_vPM≈hygroscopic sulfuric-acid particle value.",
      "Coagulation kernel controls how quickly soot becomes activation-capable.",
    ],
    outputs: ["Updated κ array for soot bins; this directly changes the soot activation threshold."],
    checks: [
      "κ_soot,eff should remain bounded between plausible hydrophobic soot and sulfur-rich values.",
      "If high FSC does not affect soot activation, check sulfur-to-soot coagulation and coating diagnostics.",
    ],
  },
  {
    id: "kohler",
    phase: "Activation",
    title: "8. Activate liquid droplets with κ-Köhler theory",
    short:
      "Each aerosol mode grows hygroscopically; particles activate when ambient saturation exceeds their critical Köhler saturation.",
    code: ["pyepm/aerosols/activation.py", "pyepm/aerosols/__init__.py: Aerosol.evolve_dw_stable"],
    inputs: [
      "Dry diameter d_dry, current wet diameter d_wet, κ, plume T, and RHw.",
      "Critical wet diameter and saturation for each bin.",
    ],
    equations: [
      String.raw`a_w=\frac{d_w^3-d_{dry}^3}{d_w^3-(1-\kappa)d_{dry}^3}`,
      String.raw`S_v(d_w)=a_w\exp\left(\frac{4\sigma_{w/a}MW_{\mathrm{H_2O}}}{RT\rho_{\mathrm{H_2O}}d_w}\right)`,
      String.raw`\mathrm{activated}\iff S_{amb}\ge S_{v,crit}\quad\mathrm{or}\quad d_w\ge d_{w,crit}`,
    ],
    parameters: [
      "κ: hygroscopicity of soot, sulfur, or ambient aerosol.",
      "σ_w/a(T): water-air surface tension.",
      "d_w,crit and S_v,crit are solved numerically for each bin.",
    ],
    outputs: [
      "Activated liquid aerosol mask h_act_wet.",
      "Updated wet diameters and liquid water uptake.",
    ],
    checks: [
      "Activation should occur near the plume supersaturation peak, not arbitrarily at initialization.",
      "Low-κ soot should require coating or very high supersaturation to activate efficiently.",
    ],
  },
  {
    id: "freezing-growth",
    phase: "Ice formation",
    title: "9. Freeze activated droplets and grow ice",
    short:
      "Activated droplets freeze with a Koop water-activity criterion; newly frozen and existing ice particles then grow by deposition.",
    code: ["pyepm/aerosols/iceNucleation.py: iceNucleationKoop", "pyepm/aerosols/__init__.py: Aerosol.evolve_dw_deposition"],
    inputs: [
      "Wet particle size, water activity a_w, plume temperature, timestep, and cooling rate.",
      "Water vapor saturation with respect to ice and liquid.",
    ],
    equations: [
      String.raw`\Delta a_w=a_w-a_{w,i}(T)`,
      String.raw`\log_{10}J=-906.7+8502\Delta a_w-26924\Delta a_w^2+29180\Delta a_w^3`,
      String.raw`P_{freeze}=1-\exp\left(-\frac{V_{liq}J}{\tau_f^{-1}}\right)`,
      String.raw`\frac{dm}{dt}=4\pi\rho rG(r,T,p)\left(fS_{amb}-S_{particle}\right)`,
    ],
    parameters: [
      "J: homogeneous ice nucleation rate from Koop et al. water-activity parameterization.",
      "τ_f⁻¹: freezing timescale estimate using dlogJ/dT and plume cooling rate.",
      "G(r,T,p): diffusion/heat-transfer-limited growth coefficient.",
    ],
    outputs: [
      "New ice number per timestep for sulfur, soot, and ambient modes.",
      "Ice diameters and ice PDFs on the model ice grid.",
      "Water vapor depletion dm that feeds back into xH₂O.",
    ],
    checks: [
      "No negative particle numbers; no ice growth when the plume is subsaturated with respect to ice unless physically justified.",
      "Large jumps in ice number should align with a clear supersaturation/freezing threshold crossing.",
    ],
  },
  {
    id: "outputs",
    phase: "Outputs",
    title: "10. Report the predicted ice population",
    short:
      "The main scientific output is the ice number and size distribution, traceable by precursor type and normalized per kg fuel.",
    code: ["pyepm/epm/ivp.py: pyEPM.solve", "pyepm/epm/solution.py: Solution.write"],
    inputs: [
      "Final microphysics state and time series of plume thermodynamics.",
      "Dilution factor converting cm⁻³ plume concentrations to #/kg fuel.",
    ],
    equations: [
      String.raw`N_{ice,\mathrm{cm}^{-3}}=x_{ice}\,n_{air}(T,p)`,
      String.raw`N_{ice,\mathrm{kgfuel}^{-1}}=N_{ice,\mathrm{cm}^{-3}}\,D`,
      String.raw`f_{ice,soot}=1-\frac{N_{soot,\mathrm{kgfuel}^{-1}}(t)}{N_{soot,\mathrm{kgfuel}^{-1}}(0)}`,
      String.raw`pdf_{ice}=pdf_{ice,sulfur}+pdf_{ice,ions}+pdf_{ice,soot}+pdf_{ice,ambient}`,
    ],
    parameters: [
      "dilution: derived from mass-based dilution or plume area/fuel-flow relation.",
      "epm_area: final plume cross-sectional area passed to downstream APCEMM-style tools.",
      "ice_r grid: radius coordinate for the final ice PDF.",
    ],
    outputs: [
      "states.parquet: time series including RHl, RHi, total_ice_per_cm3, total_ice_per_kgfuel.",
      "mode property files: soot/sulfur/ion/ambient PDFs, ice PDFs, sizes, κ, activation variables.",
      "epm-output.nc: finalTemp, area, ice_pdf, and sulfate PDF for downstream contrail evolution.",
    ],
    checks: [
      "Final claims should be based on ice number, size, plume area, and saturation history together.",
      "Radiative-forcing interpretations must be consistent with optical-depth-relevant ice number and size trends.",
    ],
  },
];

const groupedPhases = ["Inputs", "Initialization", "Plume dynamics", "Thermodynamics", "Microphysics", "Activation", "Ice formation", "Outputs"];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20">
      {children}
    </span>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EquationBlock({ equation }: { equation: string }) {
  const html = katex.renderToString(equation, {
    displayMode: true,
    throwOnError: false,
    strict: false,
  });

  return (
    <div
      className="overflow-x-auto rounded-xl bg-black/[0.03] px-4 py-4 text-[var(--foreground)] dark:bg-white/[0.06] [&_.katex-display]:my-0 [&_.katex]:text-[1.03rem]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function PyepmFlowchart() {
  const [activeId, setActiveId] = useState(flowSteps[0].id);
  const activeIndex = flowSteps.findIndex((step) => step.id === activeId);
  const activeStep = flowSteps[activeIndex] ?? flowSteps[0];

  const phaseCounts = useMemo(
    () => groupedPhases.map((phase) => ({ phase, count: flowSteps.filter((step) => step.phase === phase).length })),
    [],
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_52%,#eef2ff_100%)] p-8 ring-1 ring-black/5 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#1e1b4b_100%)] dark:ring-white/10 lg:p-10">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Interactive model map</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Coupled physics flowchart for pyEPM early-plume microphysics
          </h1>
          <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
            Click each node to trace how pyEPM converts engine and ambient inputs into the predicted contrail ice population. The map emphasizes the physical couplings that matter for soot, fuel sulfur content, water supersaturation, aerosol activation, and ice formation.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {phaseCounts.map(({ phase, count }) => (
              <Pill key={phase}>{phase} · {count}</Pill>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-h-[75vh] overflow-y-auto rounded-3xl border border-black/8 bg-white/80 p-4 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5 sm:p-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Step-by-step flow</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Select a node to inspect equations, parameters, and outputs.</p>
            </div>
            <div className="text-sm font-semibold text-[var(--accent)]">{activeIndex + 1}/{flowSteps.length}</div>
          </div>

          <div className="relative flex flex-col gap-3 before:absolute before:left-5 before:top-8 before:h-[calc(100%-4rem)] before:w-px before:bg-[color:var(--accent)]/25">
            {flowSteps.map((step, index) => {
              const isActive = step.id === activeStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveId(step.id)}
                  className={`relative z-10 flex w-full gap-4 rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 shadow-sm"
                      : "border-black/8 bg-[var(--surface)] hover:border-[color:var(--accent)]/30 hover:bg-[color:var(--accent)]/5 dark:border-white/10"
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive ? "bg-[var(--accent)] text-white" : "bg-[color:var(--accent)]/12 text-[var(--accent)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{step.phase}</span>
                    <span className="mt-1 block font-semibold text-[var(--foreground)]">{step.title.replace(/^\d+\.\s*/, "")}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{step.short}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <article className="rounded-3xl border border-black/8 bg-white/90 p-6 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Pill>{activeStep.phase}</Pill>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{activeStep.title}</h2>
              <p className="mt-3 leading-8 text-[var(--muted)]">{activeStep.short}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveId(flowSteps[Math.max(activeIndex - 1, 0)].id)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
                disabled={activeIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setActiveId(flowSteps[Math.min(activeIndex + 1, flowSteps.length - 1)].id)}
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={activeIndex === flowSteps.length - 1}
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-6">
            <div className="rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-black/5 dark:ring-white/10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Relevant equations</h3>
              <div className="mt-3 space-y-2">
                {activeStep.equations.map((eq) => (
                  <EquationBlock key={eq} equation={eq} />
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <DetailList title="Inputs used here" items={activeStep.inputs} />
              <DetailList title="Parameters defined" items={activeStep.parameters} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <DetailList title="Outputs passed forward" items={activeStep.outputs} />
              <DetailList title="Physical sanity checks" items={activeStep.checks} />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Code trace</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeStep.code.map((item) => (
                  <code key={item} className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-[var(--muted)] dark:bg-white/[0.08]">
                    {item}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-black/8 bg-[var(--surface)] p-6 dark:border-white/10 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Scientific endpoint</p>
        <h2 className="mt-3 text-2xl font-semibold">What should be interpreted from pyEPM?</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-black/[0.03] p-5 dark:bg-white/[0.05]">
            <h3 className="font-semibold">Ice number</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              The primary output is total_ice_per_kgfuel, with separate soot-, sulfur-, and ambient-origin contributions. This is the most direct link to engine exhaust parameters.
            </p>
          </div>
          <div className="rounded-2xl bg-black/[0.03] p-5 dark:bg-white/[0.05]">
            <h3 className="font-semibold">Ice size distribution</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              The ice_pdf on the ice radius grid controls optical-depth-relevant quantities and provides the handoff to downstream contrail evolution models.
            </p>
          </div>
          <div className="rounded-2xl bg-black/[0.03] p-5 dark:bg-white/[0.05]">
            <h3 className="font-semibold">Traceability</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Any claim about FSC or soot EI must be traced through sulfur aerosol growth, soot coating, activation, supersaturation, freezing, and final ice number/size.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
