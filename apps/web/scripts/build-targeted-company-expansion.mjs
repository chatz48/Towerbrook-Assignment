#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const companiesPath = join(root, "data/companies.json");
const companies = JSON.parse(readFileSync(companiesPath, "utf8"));

const targetedCompanies = [
  {
    id: "scale-microgrids",
    name: "Scale Microgrids",
    themes: ["grid-infrastructure", "clean-energy-advisory"],
    category: "target",
    description:
      "Distributed-energy and microgrid platform acquired by EQT Infrastructure from Warburg Pincus in 2025.",
    whyInteresting:
      "Relevant peer platform for grid constraints, resilience, data centers, distributed generation and fleet electrification.",
    specialties: ["Grid connection", "Flexibility & DER markets", "Battery storage (BESS)"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "EQT Infrastructure",
    funding: "EQT acquired Scale Microgrids from Warburg Pincus (announced 2025)",
    website: "https://www.scalemicrogrids.com",
    news: [
      {
        headline: "EQT agreed to acquire Scale Microgrids from Warburg Pincus",
        date: "2025-01-09",
        url: "https://eqtgroup.com/news/eqt-to-acquire-distributed-energy-company-scale-microgrids",
        source: "EQT",
      },
    ],
    sources: [
      {
        title: "EQT to acquire distributed energy company Scale Microgrids",
        publisher: "EQT",
        url: "https://eqtgroup.com/news/eqt-to-acquire-distributed-energy-company-scale-microgrids",
      },
      {
        title: "Scale Microgrids - EQT Portfolio",
        publisher: "EQT",
        url: "https://eqtgroup.com/about/current-portfolio/scale-microgrids",
      },
    ],
    confidence: 0.86,
  },
  {
    id: "seven-seas-water-group",
    name: "Seven Seas Water Group",
    themes: ["smart-water"],
    category: "target",
    description:
      "Water-as-a-Service platform operating water and wastewater treatment plants across the Americas.",
    whyInteresting:
      "Large contracted water/wastewater platform with infrastructure ownership, operations and recurring-service characteristics.",
    specialties: ["Wastewater & treatment", "Water reuse & desalination"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "EQT Infrastructure",
    funding: "EQT agreed to acquire Seven Seas Water Group from Morgan Stanley Infrastructure Partners (2025)",
    website: "https://sevenseaswater.com",
    news: [
      {
        headline: "EQT agreed to acquire Seven Seas Water Group",
        date: "2025-05-22",
        url: "https://eqtgroup.com/en/news/eqt-to-acquire-seven-seas-water-group-a-leading-provider-of-sustainable-water-and-wastewater-solutions-2025-05-22",
        source: "EQT",
      },
    ],
    sources: [
      {
        title: "EQT to acquire Seven Seas Water Group",
        publisher: "EQT",
        url: "https://eqtgroup.com/en/news/eqt-to-acquire-seven-seas-water-group-a-leading-provider-of-sustainable-water-and-wastewater-solutions-2025-05-22",
      },
      {
        title: "Morgan Stanley Infrastructure Partners Agrees to Sell Seven Seas Water",
        publisher: "Morgan Stanley",
        url: "https://www.morganstanley.com/press-releases/msip-agrees-to-sell-seven-seas-water",
      },
    ],
    confidence: 0.86,
  },
  {
    id: "crom",
    name: "CROM",
    themes: ["smart-water"],
    category: "target",
    description:
      "Water-infrastructure services platform focused on prestressed concrete tanks, restoration and maintenance.",
    whyInteresting:
      "Frontenac-backed water infrastructure platform with an explicit buy-and-build pattern and multiple disclosed add-ons.",
    specialties: ["Wastewater & treatment", "Network & pressure analytics"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "Frontenac",
    funding: "Frontenac acquired CROM from Sciens Water (closed January 2025)",
    website: "https://www.cromcorp.com",
    news: [
      {
        headline: "Frontenac acquired CROM from Sciens Water",
        date: "2025-02-03",
        url: "https://frontenac.com/frontenac-welcomes-water-infrastructure-solutions-provider-crom-as-its-newest-portfolio-company/",
        source: "Frontenac",
      },
    ],
    sources: [
      {
        title: "Frontenac Welcomes Water Infrastructure Solutions Provider CROM",
        publisher: "Frontenac",
        url: "https://frontenac.com/frontenac-welcomes-water-infrastructure-solutions-provider-crom-as-its-newest-portfolio-company/",
      },
      {
        title: "CROM portfolio profile",
        publisher: "Frontenac",
        url: "https://frontenac.com/portfolio/crom/",
      },
    ],
    confidence: 0.85,
  },
  {
    id: "sigma-companies-international",
    name: "Sigma Companies International",
    themes: ["smart-water"],
    category: "target",
    description:
      "Waterworks-products platform acquired by Wind Point Partners with a product-line expansion and M&A thesis.",
    whyInteresting:
      "Sponsor-backed waterworks-products platform with a disclosed complementary-acquisition plan and a 2026 add-on.",
    specialties: ["Metering (AMI)", "Wastewater & treatment"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "Wind Point Partners",
    funding: "Wind Point Partners acquired Sigma Companies International (2025)",
    website: "https://www.sigmaco.com",
    news: [
      {
        headline: "Wind Point Partners acquired Sigma",
        date: "2025-04-10",
        url: "https://www.wppartners.com/wind-point-partners-acquires-sigma/",
        source: "Wind Point Partners",
      },
    ],
    sources: [
      {
        title: "Wind Point Partners Acquires Sigma",
        publisher: "Wind Point Partners",
        url: "https://www.wppartners.com/wind-point-partners-acquires-sigma/",
      },
      {
        title: "SIGMA Acquires Masonry Supply",
        publisher: "Wind Point Partners",
        url: "https://www.wppartners.com/sigma-acquires-masonry-supply-inc/",
      },
    ],
    confidence: 0.84,
  },
  {
    id: "ally-energy-solutions",
    name: "Ally Energy Solutions",
    themes: ["clean-energy-advisory", "grid-infrastructure"],
    category: "target",
    description:
      "Energy-solutions provider delivering decarbonization, modernization and resilient-power projects for commercial and industrial customers.",
    whyInteresting:
      "Majority investment by Nuveen Private Equity Impact points to sponsor demand for C&I energy-services platforms.",
    specialties: ["Energy market analytics", "Grid connection", "Battery storage (BESS)"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "Nuveen Private Equity Impact",
    funding: "Nuveen Private Equity Impact acquired a majority interest in Ally Energy Solutions (2025)",
    website: "https://ally-energy.com",
    news: [
      {
        headline: "Nuveen Private Equity Impact acquired majority interest in Ally Energy Solutions",
        date: "2025-09-30",
        url: "https://www.nuveen.com/global/insights/news/2025/nuveen-private-equity-impact-acquires-majority-interest-in-ally-energy-solutions",
        source: "Nuveen",
      },
    ],
    sources: [
      {
        title: "Nuveen Private Equity Impact Acquires Majority Interest in Ally Energy Solutions",
        publisher: "Nuveen",
        url: "https://www.nuveen.com/global/insights/news/2025/nuveen-private-equity-impact-acquires-majority-interest-in-ally-energy-solutions",
      },
    ],
    confidence: 0.83,
  },
  {
    id: "dmc-power",
    name: "DMC Power",
    themes: ["grid-infrastructure"],
    category: "target",
    description:
      "Grid-connection and power-infrastructure components business sold by Golden Gate Capital to Hubbell.",
    whyInteresting:
      "Sponsor exit to a strategic acquirer gives a grid-infrastructure valuation and buyer-appetite reference point.",
    specialties: ["Transmission & substations", "Grid connection"],
    stage: "Acquired",
    ownershipStatus: "acquired",
    owner: "Hubbell",
    funding: "Hubbell acquired DMC Power from Golden Gate Capital (2025)",
    website: "https://www.dmcpower.com",
    news: [
      {
        headline: "Golden Gate Capital sold DMC Power to Hubbell",
        date: "2025-02-18",
        url: "https://www.goldengatecap.com/news/golden-gate-capital-completes-sale-of-dmc-power-to-hubbell-inc",
        source: "Golden Gate Capital",
      },
    ],
    sources: [
      {
        title: "Golden Gate Capital Completes Sale of DMC Power to Hubbell",
        publisher: "Golden Gate Capital",
        url: "https://www.goldengatecap.com/news/golden-gate-capital-completes-sale-of-dmc-power-to-hubbell-inc",
      },
    ],
    confidence: 0.84,
  },
  {
    id: "berkeley-research-group",
    name: "Berkeley Research Group",
    themes: ["clean-energy-advisory", "grid-infrastructure", "smart-water"],
    category: "advisory",
    description:
      "Expert-services and consulting platform with energy, construction, corporate finance, disputes and performance-improvement capabilities.",
    whyInteresting:
      "TowerBrook public deal evidence positions BRG as both a sponsor-owned advisory platform and a potential expert bench.",
    specialties: ["M&A advisory", "Project finance", "Network analytics"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "TowerBrook",
    funding: "TowerBrook announced a strategic investment in Berkeley Research Group (2025)",
    website: "https://www.thinkbrg.com",
    news: [
      {
        headline: "TowerBrook announced strategic investment in BRG",
        date: "2025-02-27",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-strategic-investment-in-brg/",
        source: "TowerBrook",
      },
    ],
    sources: [
      {
        title: "TowerBrook Capital Partners Announces Strategic Investment in BRG",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-strategic-investment-in-brg/",
      },
      {
        title: "Kirkland Advises Berkeley Research Group on Investment from TowerBrook",
        publisher: "Kirkland & Ellis",
        url: "https://www.kirkland.com/news/press-release/2025/02/kirkland-advises-berkeley-research-group-on-investment-from-towerbrook",
      },
    ],
    confidence: 0.85,
  },
  {
    id: "langan",
    name: "Langan",
    themes: ["clean-energy-advisory", "grid-infrastructure"],
    category: "service-provider",
    description:
      "Engineering and environmental consulting platform serving land development, public agencies, corporate clients and the energy industry.",
    whyInteresting:
      "TowerBrook public investment evidence gives a sponsor-backed reference platform for environmental and infrastructure consulting.",
    specialties: ["Project finance", "Transmission & substations", "Grid connection"],
    stage: "Sponsor-owned",
    ownershipStatus: "sponsor-owned",
    owner: "TowerBrook minority investment",
    funding: "TowerBrook made a minority investment in Langan (2023)",
    website: "https://www.langan.com",
    news: [
      {
        headline: "Langan announced partnership with TowerBrook Capital Partners",
        date: "2023-10-26",
        url: "https://www.towerbrook.com/us/langan-announces-partnership-with-towerbrook-capital-partners/",
        source: "TowerBrook",
      },
    ],
    sources: [
      {
        title: "Langan announces partnership with TowerBrook Capital Partners",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/us/langan-announces-partnership-with-towerbrook-capital-partners/",
      },
    ],
    confidence: 0.84,
  },
];

const existingIds = new Set(companies.map((company) => company.id));
const merged = [
  ...companies.filter((company) => !targetedCompanies.some((target) => target.id === company.id)),
  ...targetedCompanies,
].sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(companiesPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(
  `Wrote ${merged.length} companies (${targetedCompanies.filter((company) => !existingIds.has(company.id)).length} added/updated from public PE evidence)`,
);
