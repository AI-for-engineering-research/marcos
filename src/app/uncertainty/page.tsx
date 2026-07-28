import { UncertaintyExplorer } from "@/components/uncertainty-explorer";

export const metadata = {
  title: "Uncertainty — Kärcher envelope explorer",
  description:
    "The full spread of pyEPM contrail-ice predictions across a six-parameter " +
    "uncertainty grid, against ECLIF3 and VOLCAN measurements.",
};

export default function UncertaintyPage() {
  return <UncertaintyExplorer />;
}
