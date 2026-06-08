"use client";

import Image from "next/image";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function PetEasterEgg() {
  const [activePet, setActivePet] = useState<"nimbus" | "kiwi" | null>(null);

  return (
    <div className="space-y-4">
      <p className="leading-8 text-[var(--muted)]">
        Outside of research, I enjoy traveling, playing basketball, cooking, and
        spending time with my cat, {" "}
        <button
          type="button"
          onClick={() => setActivePet((current) => (current === "nimbus" ? null : "nimbus"))}
          className="font-medium text-[var(--accent)] underline-offset-4 transition hover:underline"
        >
          Nimbus
        </button>
        , and my Russian tortoise, {" "}
        <button
          type="button"
          onClick={() => setActivePet((current) => (current === "kiwi" ? null : "kiwi"))}
          className="font-medium text-[var(--accent)] underline-offset-4 transition hover:underline"
        >
          Kiwi
        </button>
        .
      </p>

      {activePet ? (
        <div className="overflow-hidden rounded-2xl bg-[var(--surface)] p-3">
          <Image
            src={activePet === "nimbus" ? withBasePath("/icons/nimbus.jpeg") : withBasePath("/icons/kiwi.jpeg")}
            alt={activePet === "nimbus" ? "Nimbus the cat" : "Kiwi the tortoise"}
            width={1000}
            height={1000}
            unoptimized
            className="h-auto w-full rounded-xl object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
