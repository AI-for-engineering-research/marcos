import { Section } from "@/components/section";
import { research } from "@/lib/site-content";

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-8">
      <Section eyebrow="Research project" title={research.title} description={research.overview}>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold">Problem context</h3>
            <p className="mt-3 leading-8 text-[var(--muted)]">{research.problem}</p>
          </article>
          <article className="rounded-2xl bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold">Why intermediate-fidelity modeling</h3>
            <p className="mt-3 leading-8 text-[var(--muted)]">
              The project targets a practical middle ground: detailed enough to capture key
              early plume physics, but efficient enough to support broad sensitivity studies
              across engine and atmospheric conditions.
            </p>
          </article>
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-3">
        <Section eyebrow="Method" title="Approach">
          <ul className="space-y-3 leading-8 text-[var(--muted)]">
            {research.approach.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
        <Section eyebrow="Novelty" title="What is new">
          <ul className="space-y-3 leading-8 text-[var(--muted)]">
            {research.novelty.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
        <Section eyebrow="Impact" title="Why it matters">
          <ul className="space-y-3 leading-8 text-[var(--muted)]">
            {research.impact.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        eyebrow="Research framing"
        title="Core questions guiding the work"
        description="This project aims to connect changes in sulfur content and soot emissions to changes in contrail behavior and resulting climate forcing."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="font-semibold">Objective</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Develop an early plume model that captures how fuel sulfur content and soot
              emissions influence ice activation and contrail formation.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="font-semibold">Current limits</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Existing tools either simplify the microphysics too aggressively or become too
              expensive for broad parametric analysis.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="font-semibold">Expected value</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              A successful model would help link engine design decisions to contrail
              persistence and radiative forcing outcomes more directly.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
