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
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="rounded-3xl bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f5f7fb_100%)] p-8 shadow-sm shadow-black/5 ring-1 ring-black/5 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#111827_100%)] dark:ring-white/10 lg:p-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            Academic portfolio
          </p>
          <div className="space-y-4">
            <h1 className="max-w-5xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Quantifying the Sensitivity of Contrail Climate Impacts to Engine Exhaust Parameters
            </h1>
            <p className="text-base text-[var(--muted)] sm:text-lg">
              <span className="font-medium text-[var(--foreground)]">Marcos Logroño</span>
              <span className="px-2">•</span>
              <span>PhD Student</span>
              <span className="px-2">•</span>
              <span>MIT Laboratory for Aviation and the Environment</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/research"
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)] transition hover:opacity-90"
            >
              View research project
            </Link>
            <Link
              href="/updates"
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black/20 hover:bg-black/4 dark:border-white/10 dark:hover:bg-white/8"
            >
              Read weekly updates
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ResearchPanel() {
  return (
    <div className="flex flex-col gap-8">
      <Section eyebrow="Research project" title="">
        <div className="grid gap-6">
          <div className="w-full rounded-2xl bg-[var(--surface)] p-6">
            <p className="leading-8 text-[var(--muted)]">{research.overview}</p>
          </div>
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--surface)] p-4">
            <Image
              src={withBasePath("/contrail-formation.png")}
              alt="Diagram illustrating contrail formation"
              width={1600}
              height={900}
              unoptimized
              className="h-auto w-full rounded-xl object-contain"
            />
          </div>
          <article className="rounded-2xl bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold">Problem context</h3>
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
          <ul className="space-y-3 leading-8 text-[var(--muted)]">
            {research.novelty.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
        <Section eyebrow="Impact" title="Why it matters">
          <ul className="space-y-3 leading-8 text-[var(--muted)]">
            {research.impact.map((item) => (
              <li key={item}>{item}</li>
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
        <div className="overflow-hidden rounded-2xl bg-[var(--surface)]">
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
            <div className="relative rounded-2xl bg-[var(--surface)] p-5">
              <span className="absolute left-[-1.95rem] top-8 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-start gap-3">
                <Image src={withBasePath("/icons/puerto-rico-flag.svg")} alt="Puerto Rican flag" width={56} height={56} />
                <Image src={withBasePath("/icons/coconut-tree.svg")} alt="Coconut tree icon" width={56} height={56} />
              </div>
              <p className="mt-4 leading-8 text-[var(--muted)]">{about.intro}</p>
            </div>

            <div className="relative rounded-2xl bg-[var(--surface)] p-5">
              <span className="absolute left-[-1.95rem] top-8 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-start gap-3">
                <Image src={withBasePath("/icons/boston-icon.svg")} alt="Boston icon" width={56} height={56} />
                <Image src={withBasePath("/icons/mit-badge.svg")} alt="MIT badge" width={80} height={56} />
              </div>
              <p className="mt-4 leading-8 text-[var(--muted)]">
                {about.background[0]} {about.background[1]}
              </p>
            </div>

            <div className="relative rounded-2xl bg-[var(--surface)] p-5">
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
            className="rounded-3xl border border-black/8 bg-white/80 p-6 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5 sm:p-8"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                  {entry.week}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{entry.title}</h2>
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
              <div className="rounded-2xl bg-[var(--surface)] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">AI contribution</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{entry.aiContribution}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface)] p-5">
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
