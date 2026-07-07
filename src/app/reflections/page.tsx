"use client";

import Image from "next/image";
import { useState } from "react";
import { Section } from "@/components/section";
import { withBasePath } from "@/lib/base-path";

type FigureData = {
  src: string;
  alt: string;
  label: string;
  maxWidth?: string;
};

type ReflectionEntry = {
  week: string;
  date: string;
  bullets: Array<string | { text: string; figure: FigureData }>;
  image?: {
    src: string;
    alt: string;
  };
};

const reflections: ReflectionEntry[] = [
  {
    week: "Week 4",
    date: "June 29–July 3",
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

  return (
    <div className="flex flex-col gap-8">
      <Section
        eyebrow="Reflections"
        title="Weekly notes"
        description="Personal reflections on using AI tools to support portfolio development and research work."
      />

      <div className="space-y-6">
        {reflections.map((entry) => (
          <article
            key={entry.week}
            className="rounded-3xl border border-black/8 bg-white/80 p-6 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5 sm:p-8"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                  {entry.week}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Reflections and comments</h2>
              </div>
              <p className="text-sm text-[var(--muted)]">{entry.date}</p>
            </div>

            <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--muted)]">
              {entry.bullets.map((bullet) => (
                <li key={typeof bullet === "string" ? bullet : bullet.text}>
                  • {typeof bullet === "string" ? (
                    bullet
                  ) : (
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
                  )}
                </li>
              ))}
            </ul>

            {entry.image ? (
              <div className="mt-6 overflow-hidden rounded-2xl bg-[var(--surface)] p-4">
                <Image
                  src={entry.image.src}
                  alt={entry.image.alt}
                  width={1400}
                  height={900}
                  unoptimized
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

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
    </div>
  );
}
