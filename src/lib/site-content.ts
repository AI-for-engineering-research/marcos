export const siteMeta = {
  name: "Marcos Logroño",
  title: "AI-Assisted Engineering Research Portfolio",
  description:
    "Academic portfolio documenting AI-assisted engineering research on contrail ice formation, modeling, and climate impact.",
};

export const about = {
  intro:
    "I grew up in Añasco, a small town on the western coast of Puerto Rico, and graduated from the University of Puerto Rico at Mayagüez with a Bachelor of Science in Mechanical Engineering in 2021.",
  background: [
    "I then moved to Boston to pursue graduate studies, earning a Master of Science in Aeronautics and Astronautics from the Massachusetts Institute of Technology (MIT).",
    "At the MIT Gas Turbine Laboratory, my research focused on characterizing compressor instabilities through low-order actuator disk models.",
    "I am currently pursuing a PhD at the MIT Laboratory for Aviation and the Environment, where I use physics-based computational models to investigate the sensitivities of contrail lifetime and effective radiative forcing to variations in jet fuel sulfur content, engine exhaust parameters, and ambient atmospheric conditions.",
  ],
  interests:
    "Outside of research, I enjoy traveling, playing basketball, cooking, and spending time with my cat, Nimbus, and my Russian tortoise, Kiwi.",
  socials: {
    linkedin: "https://www.linkedin.com/in/marcos-logrono/",
    email: "mlogrono@mit.edu",
    phone: "787-519-7789",
  },
};

export const research = {
  title:
    "Investigating the Sensitivity of Contrail Ice Formation to Engine Exhaust Parameters through Physics-Based Computational Modeling",
  overview:
    "Contrail formation depends on how ice particles activate and grow in young aircraft exhaust. Because persistence and climate forcing are tightly linked to particle distributions and ambient atmospheric conditions, improving the physical fidelity of early plume modeling is essential for better impact assessment.",
  problem:
    "Low-order Gaussian plume models are computationally efficient but miss relevant early microphysics. Large eddy simulations resolve much more of the plume evolution but are too expensive for broad sensitivity studies. APCEMM offers an intermediate-fidelity starting point, yet it does not fully capture how sulfur and soot compete for water and influence ice activation.",
  approach: [
    "Develop an advanced early plume model that captures the role of fuel sulfur content (FSC) and soot emissions index on ice particle activation and growth.",
    "Integrate the new microphysics treatment into the APCEMM framework.",
    "Couple the model with rapid radiative transfer tools to estimate how climate forcing responds to changes in engine design parameters and representative ambient conditions.",
  ],
  novelty: [
    "Connect contrail radiative forcing sensitivities directly to engine exhaust parameters.",
    "Assess whether sulfur plays a meaningful role in the established Schmidt-Appleman framework for modern engines.",
    "Provide a physics-based path to evaluate how sustainable aviation fuels may influence contrail formation.",
  ],
  impact: [
    "Improve understanding of how exhaust conditions affect contrail formation and persistence.",
    "Support more realistic assessments of aviation climate impacts.",
    "Create a bridge between engine design choices and contrail climate forcing outcomes.",
  ],
};

export const updates = [
  {
    week: "Week 1",
    date: "June 2026",
    title: "Portfolio design, content refinement, and interaction updates",
    goals: [
      "Build the first working version of the academic portfolio.",
      "Refine the Project and About sections around research communication goals.",
      "Add interactive details and document the development work in a simple weekly log.",
    ],
    completed: [
      "Set up the portfolio structure in Next.js and created the Home, Project, About, and Research Logs pages.",
      "Refined the homepage hero with the new project title, centered academic identity line, and simplified layout.",
      "Updated the navigation labels and added active tab bolding for the current page.",
      "Reworked the Project page layout, including a revised problem context and a cleaner section structure.",
      "Added the contrail formation figure and tuned its placement and styling on the Project page.",
      "Built a scroll-based Method section that cycles through the three research approach steps with figures.",
      "Redesigned the About page biography into a timeline with Puerto Rico, Boston/MIT, and LAE milestones.",
      "Integrated the uploaded LAE logo and added clickable Nimbus and Kiwi easter eggs with image reveals.",
      "Tested and removed experimental side-scrolling page navigation after evaluating the interaction quality.",
    ],
    aiContribution:
      "AI assisted with implementation, layout refinement, UI iteration, interactive component building, and translation of raw research notes into web-ready content and structure.",
    nextSteps: [
      "Continue polishing the scrollytelling behavior and figure presentation.",
      "Add more weekly logs documenting research progress and AI-assisted development work.",
      "Refine project visuals, copy, and documentation as the portfolio evolves.",
    ],
  },
  {
    week: "Week 2",
    date: "June 2026",
    title: "AI-assisted pyEPM test modernization and tooling",
    goals: [
      "Review the pyEPM codebase structure and testing gaps.",
      "Replace stale tests with fast, deterministic unit coverage.",
      "Set up a reproducible local test environment.",
    ],
    completed: [
      "Added repo-local pi skills for architecture review and skeptical critique workflows.",
      "Mapped the main pyEPM modules for parameters, ODE solving, aerosols, thermodynamics, and physics.",
      "Rewrote outdated tests around current APIs, focusing on state roundtrips, grids, PDFs, parsing, ODE RHS behavior, and thermodynamic checks.",
      "Created a micromamba-based Python 3.12 test environment and installed the project in editable mode.",
      "Fixed a hardcoded entrainment CSV path by resolving it relative to the module file.",
      "Verified the updated targeted test suite with 14 passing tests.",
    ],
    aiContribution:
      "AI helped audit architecture, identify stale test assumptions, design targeted unit coverage, implement fixes, and document repeatable test commands.",
    nextSteps: [
      "Keep full pyEPM solve runs as marked slow integration tests.",
      "Expand unit coverage around aerosol microphysics and parameter invariants.",
      "Use the new pi skills for future architecture and risk reviews.",
    ],
  },
  {
    week: "Week 3",
    date: "June 2026",
    title: "Interactive 4D pyEPM sensitivity dashboard on the portfolio site",
    goals: [
      "Add a Sensitivity tab to the portfolio that lets users interactively explore how engine and ambient parameters change the early-plume mixing line and ice / aerosol time series.",
      "Sweep FSC, soot emission index, ambient temperature, and initial dilution N\u2080 across physically meaningful ranges and ship the results as a precomputed lookup, since GitHub Pages is static-only.",
      "Keep the workflow reproducible end to end, from cluster job to live URL.",
    ],
    completed: [
      "Designed a precomputed-lookup architecture: a 4D pyEPM cube + JSON manifest + Float32 binary sidecar, loaded once by the page and indexed on slider change.",
      "Built a local sweep driver (pyepm-sweep4d) with serial and parallel modes; verified bit-exact identical output between serial, parallel, and SLURM-distributed pipelines.",
      "Wrote a SLURM array driver (pyepm-sweep-slurm.py) and a separate gather command (pyepm-sweep-gather) that assembles per-case NPZ files from the cluster into the dashboard cube, with strict validation against missing cells, axis-value drift, and non-finite or negative concentrations.",
      "Reduced the 4D grid from 1050 to 600 cases (6 \u00d7 5 \u00d7 4 \u00d7 5) so the SLURM array fits under the cluster's MaxArraySize=1001 limit, while keeping the SAC threshold cluster on the T_amb axis.",
      "Implemented the Sensitivity tab with four sliders and two recharts panels reproducing notebooks/plotting.py:mixingLine() and time_series_ice(), plus an interpolate / snap-to-nearest toggle and a frozen-parameters card listing every value held constant during the sweep.",
      "Ported the pSat_H2Ol and pSat_H2Os parameterizations from pyepm/thermo into the dashboard so the saturation curves drawn in the browser match the Python reference figures exactly.",
      "Iterated on UI polish: bigger slider thumbs styled for both WebKit and Firefox, repositioned the lookup-mode card to stop overlapping the sliders, switched the ice-plot palette to a high-contrast red / blue / amber set that is legible on both light and dark themes, and rendered y-axis powers of ten as Unicode superscripts.",
      "Caught and fixed several bugs along the way, including a numpy auto-extension bug that killed all 600 SLURM tasks on the first submission and a t = 0 entry that broke log-scale time plots.",
    ],
    aiContribution:
      "AI proposed the precomputed-lookup architecture and ranked it against a Pyodide live solve, designed the binary cube + manifest format with traceability fields, scaffolded the sweep driver, SLURM array script, and gather command with end-to-end reproducibility checks, ported the saturation thermodynamics into the dashboard, and iterated on the UI based on direct visual feedback. AI also flagged scientific caveats (interpolation between grid nodes can smear physical thresholds, linear time axis compresses the activation phase) instead of silently complying.",
    nextSteps: [
      "Decide whether to keep the linear [0, 1] s ice-plot axis or switch to a log axis that preserves the activation phase.",
      "Re-run the sweep with the 212 K T_amb node included if the cluster's array-size limit can be raised on a different partition.",
      "Extend the dashboard to expose a derived ice-number-per-cm\u00b3 panel and a Schmidt-Appleman threshold overlay on the mixing line.",
      "Move the binary cube to git-LFS once a few sweep iterations have accumulated in repo history.",
    ],
  },
];
