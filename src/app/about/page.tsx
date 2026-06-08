import Image from "next/image";
import { Section } from "@/components/section";
import { about } from "@/lib/site-content";

export default function AboutPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <Section eyebrow="About me" title="Research background and personal profile">
        <div className="overflow-hidden rounded-2xl bg-[var(--surface)]">
          <Image
            src="/my-portrait.png"
            alt="Portrait of Marcos Logroño"
            width={900}
            height={1200}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      </Section>

      <div className="flex flex-col gap-8">
        <Section eyebrow="Biography" title={about.intro}>
          <div className="space-y-4 leading-8 text-[var(--muted)]">
            {about.background.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Section>

        <Section eyebrow="Beyond research" title="Personal interests" description={about.interests} />

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
