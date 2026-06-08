"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll } from "framer-motion";

const steps = [
  {
    title:
      "Develop an advanced early plume model that captures the role of fuel sulfur content (FSC) and soot emissions index on ice particle activation and growth.",
    visuals: [
      { src: "/fsc-sens.png", alt: "Fuel sulfur content sensitivity figure" },
      { src: "/temp-sens.png", alt: "Temperature sensitivity figure" },
    ],
  },
  {
    title: "Integrate the new microphysics treatment into the APCEMM framework.",
    visuals: [{ src: "/apcemm.png", alt: "APCEMM framework figure" }],
  },
  {
    title:
      "Couple the model with rapid radiative transfer tools to estimate how climate forcing responds to changes in engine design parameters and representative ambient conditions.",
    visuals: [{ src: "/rf-sens.png", alt: "Radiative forcing sensitivity figure" }],
  },
];

export function MethodScrollytelling() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      if (value < 0.34) {
        setActiveStep(0);
      } else if (value < 0.68) {
        setActiveStep(1);
      } else {
        setActiveStep(2);
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <section ref={containerRef} className="relative h-[260vh] rounded-3xl bg-[var(--surface)]">
      <div className="sticky top-24 grid gap-8 rounded-3xl bg-[var(--surface)] p-6 lg:grid-cols-[0.78fr_1.22fr] lg:p-8">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            Method
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Approach</h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <p
                key={step.title}
                className={`leading-8 transition-all duration-300 ${
                  activeStep === index
                    ? "font-bold text-[var(--foreground)]"
                    : "font-normal text-[var(--muted)]"
                }`}
              >
                {step.title}
              </p>
            ))}
          </div>
        </div>

        <div className="relative min-h-[460px] overflow-hidden rounded-3xl border border-black/8 bg-[#edf3fb] p-4 dark:border-white/10 dark:bg-white/6 sm:p-6">
          <motion.div
            initial={false}
            animate={{ opacity: activeStep === 0 ? 1 : 0, y: activeStep === 0 ? 0 : -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-4 grid gap-4 sm:grid-cols-2 sm:inset-6"
          >
            <div className="overflow-hidden rounded-2xl bg-white/70 p-3 backdrop-blur-sm">
              <Image
                src={steps[0].visuals[0].src}
                alt={steps[0].visuals[0].alt}
                width={1200}
                height={900}
                unoptimized
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <div className="overflow-hidden rounded-2xl bg-white/70 p-3 backdrop-blur-sm">
              <Image
                src={steps[0].visuals[1].src}
                alt={steps[0].visuals[1].alt}
                width={1200}
                height={900}
                unoptimized
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: activeStep === 1 ? 1 : 0, y: activeStep === 1 ? 0 : 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-4 sm:inset-6"
          >
            <div className="flex h-full items-center justify-center overflow-hidden rounded-2xl bg-white/72 p-4 backdrop-blur-sm">
              <Image
                src={steps[1].visuals[0].src}
                alt={steps[1].visuals[0].alt}
                width={1400}
                height={1000}
                unoptimized
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: activeStep === 2 ? 1 : 0, y: activeStep === 2 ? 0 : 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-4 sm:inset-6"
          >
            <div className="flex h-full items-center justify-center overflow-hidden rounded-2xl bg-white/72 p-4 backdrop-blur-sm">
              <Image
                src={steps[2].visuals[0].src}
                alt={steps[2].visuals[0].alt}
                width={1400}
                height={1000}
                unoptimized
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
