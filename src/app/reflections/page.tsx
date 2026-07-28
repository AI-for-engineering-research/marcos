"use client";

import Image from "next/image";
import { useState } from "react";
import { Section } from "@/components/section";
import {
  TranscriptModal,
  type TranscriptData,
} from "@/components/transcript-modal";
import { withBasePath } from "@/lib/base-path";

type FigureData = {
  src: string;
  alt: string;
  label: string;
  maxWidth?: string;
};

type Bullet =
  | string
  | { text: string; figure: FigureData }
  | { text: string; transcript: TranscriptData };

type ReflectionEntry = {
  week: string;
  date: string;
  title: string;
  summary: string;
  bullets: Bullet[];
  image?: {
    src: string;
    alt: string;
  };
};

const reflections: ReflectionEntry[] = [
  {
    week: "Week 7",
    date: "July 20–24",
    title: "Parametric uncertainty against flight measurements",
    summary:
      "Scoping a six-parameter uncertainty campaign through an agent grilling session, running 18,900 cases on hex, and building a portfolio tab that shades the model envelope against ECLIF3 and VOLCAN data.",
    bullets: [
      "Something I've been meaning to do for a while is compare my model to measured ice particle numbers from flight campaigns, including the uncertainties of the physics parameters that are difficult to fit.",
      "This is quite a detailed mini project. In a Claude session I detailed what I wanted: a tab in my research portfolio showing the uncertainties of my model, along with plotted measurements from flight campaigns.",
      "I already expected that this plot would require running thousands of cases, so I leveraged resources from hex (until we have our own).",
      "With the task instructions I asked Claude to `/grill-with-docs`. What followed was a series of questions — a grilling — to scope the mini project and define the parameter space.",
      {
        text: "Through the grilling session it came up that I hadn't closed a previous task that was flagging a bug already taken care of. That was my own fault, but I cleared it with the agent.",
        transcript: {
          src: withBasePath(
            "/transcripts/2026-07-27_6d-uncertainty-campaign-and-envelope-explorer.md",
          ),
          title: "6-D uncertainty campaign and Kärcher envelope explorer",
          label: "Read the session transcript",
        },
      },
      "First pass looks really good, just small tweaks here and there on the structure of the uncertainty tab.",
      "There are some cases I had to rerun after accidentally timing them out before they had a chance to finish in Slurm, but I asked Claude to set up the visualization regardless while I finished rerunning them.",
    ],
  },
  {
    week: "Week 6",
    date: "July 13–17",
    title: "Backlog-driven workflow and robustness testing",
    summary: "Using a task backlog to preserve research context, then turning to timestep robustness, water-feedback oscillations, and ice-particle population diagnostics.",
    bullets: [
      "I started using `backlog.md` for tracking tasks in my pyEPM repo, and this has been a huge upgrade in my workflow.",
      "The backlog neatly tracks tasks, outcomes, learning, and code changes, making it much easier to look back and introduce context in follow-up sessions.",
      "I started doing work on the computational robustness of my codebase.",
      "A few things were worrying me: hardcoded timestep series could become a problem when microphysics timescales change with input parameters; I logged diverging oscillations in the water feedback when simulating past t = 1 s; and sulfur ice number kept substantially increasing even when RHi was near 1.0 after the initial nucleation burst.",
      "The sulfur-ice behavior is the main issue for me, because it indicates a bug that simply increasing timestep resolution will not resolve.",
      {
        text: "I decomposed different components to understand and visualize what is happening with ice particles from different populations.",
        figure: {
          src: withBasePath("/reflections/task21-3-ice-decomposition.png"),
          alt: "Ice particle decomposition diagnostic separating contributions from different particle populations",
          label: "View ice decomposition figure",
        },
      },
      {
        text: "I fixed the problem: some sulfur aerosols were activating but not evaporating when water vapor dropped below saturation levels.",
        figure: {
          src: withBasePath("/reflections/task26-phantom-reset-fixed.png"),
          alt: "Diagnostic at T = 215 K and RHi = 120% showing the phantom-reset fix, with sulfur aerosols now evaporating below saturation",
          label: "View phantom-reset fix figure",
        },
      },
      "I developed an adaptive time-stepping scheme that actively changes the timestep to capture stiff physics, instead of relying on a universal time series. I am currently testing it.",
      "I also identified ice nucleation sensitivity to timestep size, so I need to define a convergence criterion.",
    ],
  },
  {
    week: "Week 5",
    date: "July 6–10",
    title: "Sticking coefficients, site redesign, and CFD automation",
    summary: "Narrowing pyEPM validation uncertainties, redesigning the website toward a cleaner style, and using an agent to automate CFD case setup and sensitivity matrices.",
    bullets: [
      "From last week's work, I identified two uncertainties in matching Yu's results with pyEPM: the volatile sticking coefficient and the dilution history.",
      "I used Yu's (2001) sticking coefficient model. I am not certain this is the latest model used, but at least it is something I can reference in the literature.",
      "I was starting to dislike how much my website looked like AI slop. I aimed for a more minimalist design, with more white space and a more pleasant interface. I used a SquareSpace reference and iterated with Claude Sonnet 5.",
      "I also employed a Claude agent to work on my CFD project workflow, training the agent with the working framework: flow-domain geometry, a Python wrapper, the SANS executable as a black box, and output handling.",
      "I asked the agent to develop a workflow so I can set up relevant case information through an input YAML file and run a Python script to prepare the case for a batch-job run.",
      "I tested it, and it works great. I then asked the agent to develop a framework for running case matrices, such as sensitivity analyses.",
      "The matrix workflow works neatly: I run a batch script with general sensitivity metadata, it sets up the individual cases, and the batch job submits Slurm jobs in parallel.",
    ],
  },
  {
    week: "Week 4",
    date: "June 29–July 3",
    title: "IMN validation and Yu et al. comparisons",
    summary: "Comparing predicted volatile distributions against Yu et al. (2024), diagnosing bin-resolution artifacts, and updating the IMN implementation.",
    bullets: [
      "Using the now-predicted distributions from the ion-mediated nucleation (IMN) model, I am going ahead and running a comparison with Yu's ACM results from 2024, based on ECLIF campaign fuel and engine conditions.",
      "The agent helped me extract only the data I needed from Hex to analyze locally, developing a quick script to run there. My runs are getting quite heavy now, so this was useful.",
      {
        text: "Results look qualitatively good. I noticed I had inadvertently reduced the number of bins in the volatile distribution, and my results show a \"laddering\" effect.",
        figure: {
          src: withBasePath("/reflections/week4-laddering-bin-comparison.png"),
          alt: "Karcher Fig. 3 comparison against Yu et al. (2024) showing a laddering effect from reduced bin resolution",
          label: "View laddering comparison figure",
          maxWidth: "max-w-2xl",
        },
      },
      "I initially planned to stick with this implementation of the IMN. I got stubborn and went ahead and implemented the latest version of the model, following the new thermodynamics approach from Yu et al. (2024).",
      "The agent helped extract data from relevant sources, implement and couple the model, and kept the codebase consistent, re-running the test suite after every new implementation.",
      "The older IMN model was kept as a separate mode I can still run pyEPM in.",
      {
        text: "A decomposition analysis, separating neutral from charged volatile clusters, showed that the neutral pathway was unphysically dominating the charged path. We expect bimodal distributions from these runs.",
        figure: {
          src: withBasePath("/reflections/week4-neutral-charged-decomposition.png"),
          alt: "Decomposition of neutral versus charged volatile cluster pathways",
          label: "View decomposition figure",
        },
      },
      "I initially thought I needed more data, but a re-read of Yu (2018) showed a useful interpolation that wasn't caught by the agent. This could be critical.",
    ],
  },
  {
    week: "Week 3",
    date: "June 22–27",
    title: "Building and accelerating ion-mediated nucleation",
    summary: "Moving from prescribed volatile aerosols toward a standalone and coupled IMN model, with calibration against published thermodynamic trajectories.",
    bullets: [
      "I am moving away a bit from working on the sensitivity visualization tool and started working on some lingering validation work for pyEPM.",
      "In particular, the test cases I have done until now assume a prescribed volatile aerosol distribution. While useful for sensitivity studies, this is not physically accurate. I am implementing a model to capture aerosol nucleation and growth given initial fuel sulfur content, ion emission index, and plume thermodynamic trajectory.",
      "I had previously done a poor manual attempt at this. I am feeding the agent the reference paper for the ion-mediated nucleation (IMN) model by Yu (2006).",
      "The agent found that while my implementation was qualitatively similar, there were many inconsistencies with Yu's model, including bugs in the molecular bin definition of the collision scheme and a lack of thermodynamic stability parameters for evaporation.",
      "Instead of building upon what I had, the agent developed a standalone IMN model for benchmarking, which was then coupled to pyEPM microphysics.",
      "I made sure to ask for a test suite for the standalone IMN. These evolved as the IMN was coupled to pyEPM.",
      "Initial runs were very slow: one full case was about 10 minutes. This is not efficient for testing, so I asked the agent to reduce computational costs without affecting the physics. The test suite was useful for this.",
      "The agent vectorized loops and masked empty bins, since it was applying some physics relations to bins even when they were empty. This drastically reduced computing time, from about 10 minutes to about 50 seconds.",
      "Full pyEPM results and predicted vPM distributions were not matching well with Yu et al. (2024). The target model comparison is also a full microphysics model, so I proceeded by first calibrating the other microphysics so I could isolate the IMN.",
      {
        text: "The paper reports temperature and humidity trajectories. I used these to calibrate entrainment and dilution parameters, assuming they use the same relations from Kärcher (2015).",
        figure: {
          src: withBasePath("/reflections/yu2024-fig1a-temperature-panels.png"),
          alt: "Temperature and humidity calibration panels based on Yu et al. (2024)",
          label: "View calibration figure",
        },
      },
      "The agent struggled a bit with extracting data from these plots because many colors were hard to distinguish when lines overlap. I worked mostly with Cases 2 and 6.",
      "Once calibrated, the next step was to compare distributions at the same timestamps. They state that the distributions shown are right before RH = 100%.",
      "What followed was a back and forth between me and the agent: the agent attempted to find bugs and inconsistencies, I addressed the possible issues it reported, the agent made fixes, I replotted the comparison, results got closer but were still off, and the cycle repeated.",
      "What I noticed was that many inconsistencies stemmed from the agent making approximations when there was a lack of information in the paper, or when certain aspects of the model were outsourced to another paper.",
      {
        text: "I made the agent ask me for additional literature whenever it lacked information. This went really well. My aerosol distributions now follow the reported distributions in Yu et al. (2024) very closely. There are still some differences, but I will continue working on these.",
        figure: {
          src: withBasePath("/reflections/yu2024-fig3-volatile-comparison.png"),
          alt: "Volatile aerosol distribution comparison against Yu et al. (2024)",
          label: "View distribution comparison",
        },
      },
    ],
  },
  {
    week: "Week 2",
    date: "June 15–18",
    title: "Flowchart and sensitivity dashboard",
    summary: "Using the agent as a computational physics coworker to map pyEPM and prototype a precomputed sensitivity dashboard.",
    bullets: [
      "I am starting to use the Pi agent for my actual research work now.",
      "In my research code repo for pyEPM, I added an `AGENTS.md` file for the context of that work. I will be using Pi as a computational physics coworker.",
      "Based on suggestions, and to test the agent’s understanding of my model, I asked it to develop a flowchart of pyEPM, including input parameters, initialization, driving equations, and how the physics are coupled.",
      "I used GPT 5.4. The first pass looked alright, although it implied that the kinetic nucleation model was also driving particle growth through condensation. This is a misconception: particles do grow by coagulation, but condensation is a separate mechanism.",
      "I tweaked the panel a bit. At first it was designed inconveniently, and I had to scroll up and down between steps of the flowchart. I fixed this by having both the left panel with step selection and the right panel with description and equations be scrollable.",
      "The next big addition was the Sensitivity tab.",
      "What I want now is a prototype of what I want my regression model to look like. I am asking the agent how I can use my model to plot results given some modified parameters that the user can input through sliders. For starters, I will have FSC, ambient temperature, initial dilution, and soot EI sliders.",
      "The agent gave two options: Pyodide, which would effectively solve my model in the browser, or a precomputed 4D pyEPM cube to develop a lookup table.",
      "I asked for a parameter sweep to run on Hex, since running in serial on my computer would have taken hours.",
      "The initial test was too large for a single batch, so I reduced the size to 600 grid points for now.",
      "The first pass was very rough: sliders were on top of each other, and plot titles were hardly visible. After a few UI iterations, it looks pretty good now.",
      "While playing around with the sliders, I noticed that the temperature interpolation was doing something odd. The agent used multilinear interpolation to develop the lookup table. It seems that this approach is not good for the temperature slider because the nucleation timescale shifts significantly, and the interpolation struggles to capture that with the low resolution I provided.",
    ],
    image: {
      src: withBasePath("/fix-interpolation.png"),
      alt: "Plot showing interpolation issues in the temperature sensitivity results",
    },
  },
  {
    week: "Week 1",
    date: "June 8–12",
    title: "Portfolio setup and first AI-assisted iteration",
    summary: "Starting the summer pilot, setting up the portfolio site, refining content, and adding initial project/about interactions.",
    bullets: [
      "First log for the summer AI engineering research pilot.",
      "In our first session, it was mentioned that I should not use the Pi agent on Hex, so I cloned my pyEPM repo locally to use the agent there.",
      "My first task was to develop a personal website for my research projects.",
      "I wrote an `AGENTS.md` file for the agent context window and provided my personal and research information through markdown files.",
      "I then gave instructions to the agent to develop my website. I wanted different clickable tabs for each section of the webpage, and the agent decided Next.js would be the best development framework for the task.",
      "I used GPT 5.5 for the initial planning. The first pass looked good, but there was a lot of redundant information. For example, the first Home tab had basically the same content as all the other tabs. This probably makes sense because I did not provide much content and I did not specify what I wanted on the Home page.",
      "I tweaked and modified the webpage to my liking. I used GPT 5.4 for this, since these tasks are much lighter.",
      "One thing I noticed was that the window would annoyingly shift a little between the Home page and the other tabs. Working with the agent, we found out that the Home page did not have a scroll bar, and this was causing the small shift between pages.",
      "For the Project tab, I added some result plots from my work and made a scrollytelling panel for them.",
      "Lastly, I implemented a timeline panel on the About Me page and added some little easter eggs for my pets.",
    ],
  },
];

export default function ReflectionsPage() {
  const [activeFigure, setActiveFigure] = useState<FigureData | null>(null);
  const [activeTranscript, setActiveTranscript] =
    useState<TranscriptData | null>(null);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const activeReflection = reflections.find((entry) => entry.week === activeWeek) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <Section
        eyebrow="Reflections"
        title="Weekly notes"
        description="Personal reflections on using AI tools to support portfolio development and research work. Select a reflection to open the full entry."
      />

      <div className="border-b editorial-rule">
        <div className="flex flex-wrap gap-2 pb-4">
          <button
            type="button"
            onClick={() => setActiveWeek(null)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeReflection === null
                ? "border-[var(--accent-deep)] bg-[var(--accent-deep)] text-white"
                : "border-[var(--line)] text-[var(--accent-deep)] hover:bg-[var(--surface-soft)]"
            }`}
          >
            All reflections
          </button>
          {reflections.map((entry) => (
            <button
              key={entry.week}
              type="button"
              onClick={() => setActiveWeek(entry.week)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeReflection?.week === entry.week
                  ? "border-[var(--accent-deep)] bg-[var(--accent-deep)] text-white"
                  : "border-[var(--line)] text-[var(--accent-deep)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              {entry.week}
            </button>
          ))}
        </div>
      </div>

      {activeReflection === null ? (
        <div className="grid gap-4">
          {reflections.map((entry) => (
            <button
              key={entry.week}
              type="button"
              onClick={() => setActiveWeek(entry.week)}
              className="group border bg-white p-6 text-left transition editorial-rule hover:border-[var(--accent)] hover:bg-[var(--surface-soft)] sm:p-7"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                    {entry.week}
                  </p>
                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[var(--accent-deep)]">
                    {entry.title}
                  </h2>
                  <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">{entry.summary}</p>
                </div>
                <div className="shrink-0 text-sm text-[var(--muted)]">{entry.date}</div>
              </div>
              <span className="mt-5 inline-block text-sm font-medium text-[var(--accent)] underline-offset-4 group-hover:underline">
                Read full reflection
              </span>
            </button>
          ))}
        </div>
      ) : (
        <article className="border bg-white p-6 editorial-rule sm:p-8">
          <button
            type="button"
            onClick={() => setActiveWeek(null)}
            className="mb-6 text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            ← Back to all reflections
          </button>

          <div className="flex flex-col gap-2 border-b pb-6 editorial-rule sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                {activeReflection.week}
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] text-[var(--accent-deep)] sm:text-4xl">
                {activeReflection.title}
              </h2>
              <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">{activeReflection.summary}</p>
            </div>
            <p className="shrink-0 text-sm text-[var(--muted)]">{activeReflection.date}</p>
          </div>

          <ul className="mt-7 space-y-4 text-sm leading-7 text-[var(--muted)]">
            {activeReflection.bullets.map((bullet) => (
              <li key={typeof bullet === "string" ? bullet : bullet.text} className="flex gap-3">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>
                  {typeof bullet === "string" ? (
                    bullet
                  ) : "figure" in bullet ? (
                    <>
                      {bullet.text}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveFigure(bullet.figure)}
                        className="font-medium text-[var(--accent)] underline-offset-4 transition hover:underline"
                      >
                        {bullet.figure.label}
                      </button>
                    </>
                  ) : (
                    <>
                      {bullet.text}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTranscript(bullet.transcript)}
                        className="font-medium text-[var(--accent)] underline-offset-4 transition hover:underline"
                      >
                        {bullet.transcript.label}
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {activeReflection.image ? (
            <div className="mt-8 overflow-hidden border bg-[var(--surface-soft)] p-4 editorial-rule">
              <Image
                src={activeReflection.image.src}
                alt={activeReflection.image.alt}
                width={1400}
                height={900}
                unoptimized
                className="h-auto w-full object-contain"
              />
            </div>
          ) : null}
        </article>
      )}

      {activeFigure ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6" role="dialog" aria-modal="true">
          <div
            className={`relative max-h-[90vh] w-full overflow-auto rounded-3xl bg-[var(--surface)] p-5 shadow-2xl ${activeFigure.maxWidth ?? "max-w-5xl"}`}
          >

            <button
              type="button"
              onClick={() => setActiveFigure(null)}
              className="absolute right-4 top-4 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-[var(--muted)] transition hover:bg-black/5"
            >
              Close
            </button>
            <div className="mt-8 overflow-hidden rounded-2xl bg-[var(--background)] p-3">
              <Image
                src={activeFigure.src}
                alt={activeFigure.alt}
                width={1800}
                height={1200}
                unoptimized
                className="h-auto w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeTranscript ? (
        <TranscriptModal
          key={activeTranscript.src}
          transcript={activeTranscript}
          onClose={() => setActiveTranscript(null)}
        />
      ) : null}
    </div>
  );
}
