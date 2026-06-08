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
    title: "Repository audit and portfolio architecture planning",
    goals: [
      "Assess the current repository contents.",
      "Define the site architecture needed for a professional academic portfolio.",
      "Determine how to preserve and reuse existing research and biography content.",
    ],
    completed: [
      "Audited the repository and confirmed it was in a content-only state.",
      "Created a repo-specific roadmap for a Next.js portfolio implementation.",
      "Identified `about_me.md` and `research.md` as canonical source content for the first version of the site.",
    ],
    aiContribution:
      "AI assisted with repository inspection, gap analysis, implementation planning, and translation of raw markdown content into a structured web architecture.",
    nextSteps: [
      "Build the site scaffold.",
      "Create the required portfolio sections.",
      "Add feature documentation and an update workflow.",
    ],
  },
  {
    week: "Week 2",
    date: "June 2026",
    title: "Initial portfolio implementation",
    goals: [
      "Bootstrap the application.",
      "Implement shared layout and core routes.",
      "Create an initial documentation baseline for future additions.",
    ],
    completed: [
      "Set up a Next.js app-router project structure.",
      "Implemented Home, Research, About, and Updates pages.",
      "Added docs describing the site structure and content workflow.",
    ],
    aiContribution:
      "AI generated initial page scaffolding, reusable layout ideas, content formatting, and documentation drafts while preserving original repository content.",
    nextSteps: [
      "Refine content writing and visuals.",
      "Add research figures, publications, or project milestones.",
      "Continue documenting weekly progress and AI-assisted development work.",
    ],
  },
];
