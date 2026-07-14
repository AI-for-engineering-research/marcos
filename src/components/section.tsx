export function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t bg-[color:var(--surface)]/58 px-0 py-8 editorial-rule sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[0.34fr_1fr]">
        <div>
          {eyebrow ? (
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
              {eyebrow}
            </p>
          ) : null}
        </div>
        <div className="max-w-4xl">
          {title ? <h2 className="text-3xl font-medium tracking-[-0.04em] text-[var(--accent-deep)] sm:text-4xl">{title}</h2> : null}
          {description ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-7">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
