import Link from "next/link";
import { Section } from "@/components/section";
import { about, research, updates } from "@/lib/site-content";

const highlights = [
  {
    title: "Research focus",
    text: "Physics-based computational modeling of contrail formation, persistence, and climate forcing.",
  },
  {
    title: "Portfolio purpose",
    text: "A lightweight academic site documenting research progress and AI-assisted development work.",
  },
  {
    title: "Ongoing documentation",
    text: "Weekly updates track decisions, implementation progress, and how AI agents support the workflow.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="grid gap-8 rounded-3xl bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f5f7fb_100%)] p-8 shadow-sm shadow-black/5 ring-1 ring-black/5 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#111827_100%)] dark:ring-white/10 lg:grid-cols-[1.3fr_0.9fr] lg:p-12">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            Academic portfolio
          </p>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Marcos Logroño — AI-assisted engineering research on contrail formation.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This portfolio presents ongoing doctoral research, highlights the role of
              physics-based computational modeling, and documents how AI agents are being
              used to support development and research communication.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
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

        <div className="grid gap-4 self-start">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/8 bg-white/80 p-5 dark:border-white/10 dark:bg-white/6"
            >
              <h2 className="text-base font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Section
        eyebrow="Featured project"
        title={research.title}
        description={research.overview}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold">Why this matters</h3>
            <p className="mt-3 leading-8 text-[var(--muted)]">{research.problem}</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold">Current direction</h3>
            <ul className="mt-3 space-y-3 text-[var(--muted)]">
              {research.approach.map((item) => (
                <li key={item} className="leading-8">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Section
          eyebrow="About"
          title="Researcher profile"
          description={about.intro}
        >
          <p className="max-w-2xl leading-8 text-[var(--muted)]">{about.background[2]}</p>
          <div className="mt-5">
            <Link href="/about" className="text-sm font-medium text-[var(--accent)]">
              Learn more about my background →
            </Link>
          </div>
        </Section>

        <Section
          eyebrow="Recent log"
          title={updates[0].title}
          description={updates[0].aiContribution}
        >
          <ul className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            {updates[0].completed.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
