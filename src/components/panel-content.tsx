"use client";

import Image from "next/image";
import Link from "next/link";
import { MethodScrollytelling } from "@/components/method-scrollytelling";
import { PetEasterEgg } from "@/components/pet-easter-egg";
import { Section } from "@/components/section";
import { withBasePath } from "@/lib/base-path";
import { about, research, updates } from "@/lib/site-content";

export function HomePanel() {
  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <section className="grid min-h-[calc(100vh-11rem)] items-center gap-10 border-b editorial-rule pb-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-4xl">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.32em] text-[var(--accent)]">
            AI-assisted engineering research portfolio
          </p>
          <h1 className="mt-8 text-5xl font-medium leading-[0.95] tracking-[-0.07em] text-[var(--accent-deep)] sm:text-6xl lg:text-7xl">
            Contrail climate impacts, traced from exhaust to ice.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
            Quantifying how engine exhaust parameters influence contrail microphysics,
            persistence, and radiative forcing.
          </p>
          <p className="mt-8 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Marcos Logroño · PhD Student · MIT Laboratory for Aviation and the Environment
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/research"
              className="border border-[var(--accent-deep)] bg-[var(--accent-deep)] px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Research project
            </Link>
            <Link
              href="/sensitivity"
              className="border border-[var(--line)] bg-white/35 px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-[var(--accent-deep)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              Explore data
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden bg-[var(--surface-soft)]">
            <Image
              src={withBasePath("/contrail-formation.png")}
              alt="Contrail formation diagram"
              width={1600}
              height={1200}
              priority
              unoptimized
              className="h-full w-full object-cover opacity-90 mix-blend-multiply dark:mix-blend-normal"
            />
          </div>
          <div className="absolute -bottom-8 -left-8 hidden w-56 border bg-[color:var(--surface)]/90 p-5 backdrop-blur editorial-rule sm:block">
            <p className="text-[0.65rem] uppercase tracking-[0.24em] text-[var(--accent)]">Focus</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Early plume aerosol activation, ice growth, and climate response under changing fuel and engine conditions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-b pb-16 editorial-rule lg:grid-cols-3">
        {[
          ["01", "Microphysics", "How soot, sulfur, water vapor, and ambient temperature shape initial ice activation."],
          ["02", "Modeling", "Physics-based computational tools bridge detailed plume evolution and broad sensitivity studies."],
          ["03", "Climate signal", "Radiative forcing estimates connect exhaust choices to aviation climate impact."],
        ].map(([kicker, title, text]) => (
          <article key={title} className="border-t pt-5 editorial-rule">
            <p className="text-[0.7rem] uppercase tracking-[0.26em] text-[var(--accent)]">{kicker}</p>
            <h2 className="mt-5 text-2xl font-medium tracking-[-0.04em] text-[var(--accent-deep)]">{title}</h2>
            <p className="mt-4 leading-7 text-[var(--muted)]">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ResearchPanel() {
  return (
    <div className="flex flex-col gap-8">
      <Section eyebrow="Research project" title="">
        <div className="grid gap-6">
          <div className="w-full border-l-2 border-[var(--accent)] bg-[color:var(--surface)]/60 p-6">
            <p className="text-lg leading-9 text-[var(--muted)]">{research.overview}</p>
          </div>
          <div className="mx-auto w-full max-w-3xl overflow-hidden bg-[var(--surface-soft)] p-4">
            <Image
              src={withBasePath("/contrail-formation.png")}
              alt="Diagram illustrating contrail formation"
              width={1600}
              height={900}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>
          <article className="border-t pt-6 editorial-rule">
            <h3 className="text-xl font-medium tracking-[-0.03em] text-[var(--accent-deep)]">Problem context</h3>
            <p className="mt-3 leading-8 text-[var(--muted)]">
              As sustainable aviation fuel technologies continue to evolve, there is a growing
              need to understand how changes in fuel composition and engine exhaust properties
              may alter contrail formation and climate impacts. Quantifying these sensitivities
              is essential for evaluating whether emerging propulsion and fuel strategies reduce
              aviation climate impacts in practice, rather than only at the level of CO₂
              accounting.
            </p>
          </article>
        </div>
      </Section>

      <MethodScrollytelling />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section eyebrow="Novelty" title="What is new">
          <ul className="space-y-4 leading-8 text-[var(--muted)]">
            {research.novelty.map((item) => (
              <li className="border-t pt-4 editorial-rule" key={item}>{item}</li>
            ))}
          </ul>
        </Section>
        <Section eyebrow="Impact" title="Why it matters">
          <ul className="space-y-4 leading-8 text-[var(--muted)]">
            {research.impact.map((item) => (
              <li className="border-t pt-4 editorial-rule" key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>

    </div>
  );
}

export function AboutPanel() {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <Section eyebrow="About me" title="">
        <div className="overflow-hidden bg-[var(--surface-soft)]">
          <Image
            src={withBasePath("/my-portrait.png")}
            alt="Portrait of Marcos Logroño"
            width={900}
            height={1200}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      </Section>

      <div className="flex flex-col gap-8">
        <Section eyebrow="Biography" title="Timeline">
          <div className="relative space-y-8 pl-8 before:absolute before:left-4 before:top-2 before:h-[calc(100%-0.5rem)] before:w-px before:bg-[color:var(--accent)]/25">
            <div className="relative border bg-[color:var(--surface)]/66 p-5 editorial-rule">
              <span className="absolute left-[-1.95rem] top-8 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-start gap-3">
                <Image src={withBasePath("/icons/puerto-rico-flag.svg")} alt="Puerto Rican flag" width={56} height={56} />
                <Image src={withBasePath("/icons/coconut-tree.svg")} alt="Coconut tree icon" width={56} height={56} />
              </div>
              <p className="mt-4 leading-8 text-[var(--muted)]">{about.intro}</p>
            </div>

            <div className="relative border bg-[color:var(--surface)]/66 p-5 editorial-rule">
              <span className="absolute left-[-1.95rem] top-8 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-start gap-3">
                <Image src={withBasePath("/icons/boston-icon.svg")} alt="Boston icon" width={56} height={56} />
                <Image src={withBasePath("/icons/mit-badge.svg")} alt="MIT badge" width={80} height={56} />
              </div>
              <p className="mt-4 leading-8 text-[var(--muted)]">
                {about.background[0]} {about.background[1]}
              </p>
            </div>

            <div className="relative border bg-[color:var(--surface)]/66 p-5 editorial-rule">
              <span className="absolute left-[-1.95rem] top-8 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-start gap-3">
                <Image
                  src={withBasePath("/icons/lae-logo.png")}
                  alt="MIT Laboratory for Aviation and the Environment logo"
                  width={96}
                  height={56}
                  unoptimized
                />
              </div>
              <p className="mt-4 leading-8 text-[var(--muted)]">{about.background[2]}</p>
            </div>
          </div>
        </Section>

        <Section eyebrow="Beyond research" title="Personal interests">
          <PetEasterEgg />
        </Section>

        <Section eyebrow="Contact" title="Professional links and contact information">
          <ul className="space-y-3 text-[var(--muted)]">
            <li>
              <span className="font-medium text-[var(--foreground)]">LinkedIn:</span>{" "}
              <a className="text-[var(--accent)]" href={about.socials.linkedin} target="_blank" rel="noreferrer">
                {about.socials.linkedin}
              </a>
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)]">Email:</span> {about.socials.email}
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)]">Phone:</span> {about.socials.phone}
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

export function UpdatesPanel() {
  return (
    <div className="flex flex-col gap-8">
      <Section
        eyebrow="Weekly documentation"
        title="AI-assisted development and research updates"
        description="This section records ongoing progress, decisions, and how AI agents are being used to support implementation, planning, and research communication."
      />

      <div className="space-y-6">
        {updates.map((entry) => (
          <article
            key={`${entry.week}-${entry.title}`}
            className="border-t bg-[color:var(--surface)]/58 py-8 editorial-rule sm:py-10"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                  {entry.week}
                </p>
                <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[var(--accent-deep)]">{entry.title}</h2>
              </div>
              <p className="text-sm text-[var(--muted)]">{entry.date}</p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">
                  Goals
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
                  {entry.goals.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">
                  Completed
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
                  {entry.completed.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="border bg-[color:var(--surface)]/70 p-5 editorial-rule">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">AI contribution</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{entry.aiContribution}</p>
              </div>
              <div className="border bg-[color:var(--surface)]/70 p-5 editorial-rule">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Next steps</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
                  {entry.nextSteps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
