import Link from "next/link";
import { siteMeta } from "@/lib/site-content";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Research" },
  { href: "/about", label: "About" },
  { href: "/updates", label: "Updates" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[color:var(--surface)]/90 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase">
            {siteMeta.name}
          </Link>
          <nav>
            <ul className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)] sm:gap-6">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link className="transition hover:text-[var(--foreground)]" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:py-14">
        {children}
      </main>
      <footer className="border-t border-black/10 bg-[color:var(--surface)] dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>{siteMeta.title}</p>
          <p>Built with Next.js for a lightweight academic portfolio.</p>
        </div>
      </footer>
    </div>
  );
}
