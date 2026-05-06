import type { Person } from "@/lib/tree/types";

const NEUTRAL_BORDER = "#c6c6c2";

export const PALETTE = {
  male: "#ececea",
  maleBorder: NEUTRAL_BORDER,
  female: "#f2e2de",
  femaleBorder: NEUTRAL_BORDER,
  other: "#ececea",
  otherBorder: NEUTRAL_BORDER,
  /** Border color used to mark everyone descended from a female branch. */
  femaleLineageBorder: "#b87a74",
  text: "#111827",
  textMuted: "#6b7280",
  link: "#b5bac3",
  cellStroke: NEUTRAL_BORDER,
  ringLight: "#e5e7eb",
  ringDark: "#94a3b8",
  accent: "#f59e0b",
  bg: "#ffffff",
};

export function personColor(p: Person) {
  if (p.gender === "M") return PALETTE.male;
  if (p.gender === "F") return PALETTE.female;
  return PALETTE.other;
}

export function personBorder(p: Person) {
  if (p.gender === "M") return PALETTE.maleBorder;
  if (p.gender === "F") return PALETTE.femaleBorder;
  return PALETTE.otherBorder;
}
