"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Project" },
  { href: "/flowchart", label: "Flowchart" },
  { href: "/about", label: "About" },
  { href: "/updates", label: "Research Logs" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[color:var(--surface)]/90 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-[0.12em] uppercase">
            AI for Engineering Research - Summer Pilot 2026
          </Link>
          <nav>
            <ul className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)] sm:gap-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      className={`transition hover:text-[var(--foreground)] ${
                        isActive
                          ? "font-semibold text-[var(--foreground)]"
                          : "font-normal text-[var(--muted)]"
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}
