import { ApcemmMovie } from "@/components/apcemm-movie";

export const metadata = {
  title: "APCEMM — contrail dispersion over twenty hours",
  description:
    "Ten APCEMM runs played side by side: how fuel sulfur content, ambient " +
    "humidity and soot emissions change where a contrail's ice ends up over " +
    "its first twenty hours.",
};

export default function ApcemmPage() {
  return <ApcemmMovie />;
}
