import { Section } from "@/components/section";
import { updates } from "@/lib/site-content";

export default function UpdatesPage() {
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
