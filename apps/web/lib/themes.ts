import type { Theme, ThemeId } from "./types";

/**
 * Sub-specialty taxonomy per theme. Drives the second filter axis in the UI and
 * tells the discovery agent which niches to fill — so coverage grows in a
 * structured way rather than as a longer flat list.
 */
export const THEME_SPECIALTIES: Record<ThemeId, string[]> = {
  "clean-energy-advisory": [
    "Solar development",
    "Offshore wind",
    "Onshore wind",
    "Battery storage (BESS)",
    "PPAs & offtake",
    "Project finance",
    "M&A advisory",
    "Energy market analytics",
    "Hydrogen & e-fuels",
  ],
  "grid-infrastructure": [
    "Grid connection",
    "Flexibility & DER markets",
    "Grid-edge software",
    "Storage optimisation & trading",
    "EV charging infrastructure",
    "Transmission & substations",
    "Smart metering",
    "Network analytics",
    "M&A advisory",
  ],
  "smart-water": [
    "Leak detection",
    "Water quality monitoring",
    "Network & pressure analytics",
    "Flood & climate risk",
    "Wastewater & treatment",
    "Digital twin & utility software",
    "Metering (AMI)",
    "Water reuse & desalination",
    "M&A advisory",
  ],
};

export const THEMES: Theme[] = [
  {
    id: "clean-energy-advisory",
    name: "Clean Energy Advisory & Development",
    shortName: "Clean Energy Advisory",
    description:
      "Firms and people who advise on, develop, and finance renewable generation — solar, wind, storage and the advisory ecosystem around them.",
    keywords: [
      "clean energy advisory",
      "renewable energy development",
      "solar developer",
      "energy transition advisory",
      "power purchase agreement advisor",
      "renewables M&A",
    ],
    accent: "#16a34a",
  },
  {
    id: "grid-infrastructure",
    name: "Grid Infrastructure & Connection",
    shortName: "Grid Infrastructure",
    description:
      "The hard infrastructure and software that connects generation to demand — substations, interconnection, grid-edge software and flexibility.",
    keywords: [
      "grid connection",
      "grid infrastructure",
      "transmission interconnection",
      "grid edge software",
      "distribution network operator",
      "energy flexibility",
    ],
    accent: "#2563eb",
  },
  {
    id: "smart-water",
    name: "Smart Water Infrastructure & Analytics",
    shortName: "Smart Water",
    description:
      "Sensing, analytics and digital infrastructure that make water networks efficient — leak detection, quality monitoring and utility software.",
    keywords: [
      "smart water",
      "water analytics",
      "leak detection",
      "water network monitoring",
      "water utility software",
      "water quality sensing",
    ],
    accent: "#0891b2",
  },
];

export const THEME_BY_ID: Record<ThemeId, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
) as Record<ThemeId, Theme>;

export function getTheme(id: string): Theme | undefined {
  return THEME_BY_ID[id as ThemeId];
}

export function specialtiesForTheme(theme: ThemeId | "all"): string[] {
  if (theme === "all") {
    return Array.from(new Set(THEMES.flatMap((item) => THEME_SPECIALTIES[item.id]))).sort();
  }
  return THEME_SPECIALTIES[theme];
}
