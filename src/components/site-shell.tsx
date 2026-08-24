"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/research", label: "Project" },
  { href: "/flowchart", label: "Flowchart" },
  { href: "/sensitivity", label: "Sensitivity" },
  { href: "/uncertainty", label: "Uncertainty" },
  { href: "/apcemm", label: "APCEMM" },
  { href: "/about", label: "About" },
  { href: "/reflections", label: "Reflections" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen text-[var(--foreground)]">
      <div className="subtle-grid pointer-events-none fixed inset-x-0 top-0 h-[36rem] opacity-60" />
      <header className="sticky top-0 z-20 border-b bg-[color:var(--background)]/82 backdrop-blur-xl editorial-rule">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group max-w-md text-sm font-medium uppercase tracking-[0.22em] text-[var(--accent-deep)]">
            Marcos Logroño
            <span className="mt-1 block text-[0.62rem] font-normal tracking-[0.28em] text-[var(--muted)]">
              Contrail microphysics · MIT LAE
            </span>
          </Link>
          <nav aria-label="Primary navigation">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--muted)] sm:gap-x-7">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      className={`border-b pb-1 transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] ${
                        isActive
                          ? "border-[var(--accent)] text-[var(--accent-deep)]"
                          : "border-transparent"
                      }`}
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-10 sm:px-8 sm:py-16">
        {children}
      </main>
    </div>
  );
}
