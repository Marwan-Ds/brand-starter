import type { BrandKit } from "@/lib/types";

export function readBrandKit(value: unknown): BrandKit | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BrandKit>;

  if (
    typeof candidate.primary !== "string" ||
    typeof candidate.secondary !== "string" ||
    typeof candidate.accent !== "string" ||
    !Array.isArray(candidate.neutrals) ||
    candidate.neutrals.length !== 4 ||
    candidate.neutrals.some((entry) => typeof entry !== "string") ||
    typeof candidate.headlineFont !== "string" ||
    typeof candidate.bodyFont !== "string"
  ) {
    return null;
  }

  return {
    primary: candidate.primary,
    secondary: candidate.secondary,
    accent: candidate.accent,
    neutrals: [
      candidate.neutrals[0],
      candidate.neutrals[1],
      candidate.neutrals[2],
      candidate.neutrals[3],
    ],
    headlineFont: candidate.headlineFont,
    bodyFont: candidate.bodyFont,
  };
}
