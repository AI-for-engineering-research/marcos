import Image from "next/image";
import { Section } from "@/components/section";
import { withBasePath } from "@/lib/base-path";

const reflections = [
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
];

export default function ReflectionsPage() {
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
                <li key={bullet}>• {bullet}</li>
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
    </div>
  );
}
