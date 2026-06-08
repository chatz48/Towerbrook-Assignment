#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const generatedAt = "2026-06-04";

const experts = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"));
const companies = JSON.parse(readFileSync(join(root, "data/companies.json"), "utf8"));
const expertByName = new Map(experts.map((expert) => [expert.name.toLowerCase(), expert.id]));
const companyByName = new Map(companies.map((company) => [company.name.toLowerCase(), company.id]));

const deals = [
  {
    id: "pe-towerbrook-gmc-2025",
    lane: "towerbrook",
    theme: "smart-water",
    secondaryThemes: ["grid-infrastructure", "clean-energy-advisory"],
    tier: 0,
    name: "TowerBrook invests in GMC Group",
    announcementDate: "2025-09-15",
    status: "completed",
    transactionType: "strategic-minority-investment",
    strategy: "private-equity",
    geography: "Ireland",
    target: "GMC Group",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["continuing-majority-owner", "GMC Group management"]],
    people: [
      ["towerbrook-deal-lead", "Joseph Knoll", "TowerBrook"],
      ["towerbrook-deal-lead", "Sumit Dheir", "TowerBrook"],
      ["target-ceo", "Shane McCloskey", "GMC Group"],
    ],
    advisors: [["financial-advisor-target", "Clearwater"]],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Founder- and management-led multi-utility infrastructure-services platform spanning water, power, renewables, and public infrastructure.",
    relevance: { theme: 20, platform: 20, control: 8, actors: 20, advisorYield: 8 },
    sources: [
      {
        title: "TowerBrook announces Strategic Investment in GMC Group",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-announces-strategic-investment-in-the-irish-infrastructure-services-provider-and-engineering-firm-gmc-group/",
        evidence: "TowerBrook announced the investment, named the TowerBrook deal leads and GMC CEO, and described management's continuing majority ownership.",
      },
      {
        title: "GMC secures investment from TowerBrook Capital Partners",
        publisher: "Clearwater",
        url: "https://www.clearwatercf.com/en-gb/experience/transactions/ire-gmc-on-its-investment-from-towerbrook-capital-partners/",
        evidence: "Clearwater identified itself as sell-side adviser to GMC.",
      },
      {
        title: "TowerBrook Investments",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/investments/",
        evidence: "TowerBrook's current investment portfolio lists GMC as an active investment.",
      },
    ],
    missingFacts: ["transaction_value", "towerbrook_stake", "completion_date", "legal_advisors", "commercial_and_financial_diligence"],
  },
  {
    id: "pe-towerbrook-jsm-2024",
    lane: "towerbrook",
    theme: "grid-infrastructure",
    secondaryThemes: ["clean-energy-advisory"],
    tier: 0,
    name: "TowerBrook makes majority investment in JSM",
    announcementDate: "2024-07-29",
    status: "completed",
    transactionType: "majority-investment",
    strategy: "private-equity",
    geography: "United Kingdom",
    target: "JSM Group",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["continuing-owner", "JSM Group founders and management"]],
    people: [
      ["towerbrook-deal-lead", "Joseph Knoll", "TowerBrook"],
      ["towerbrook-deal-lead", "Sumit Dheir", "TowerBrook"],
      ["target-founder-ceo", "Stuart Wiltshire", "JSM Group"],
      ["target-founder-coo", "John Scanlon", "JSM Group"],
      ["target-chair", "John Leahy", "JSM Group"],
      ["debt-financing-counsel-lender", "Neil Campbell", "DLA Piper"],
      ["debt-financing-counsel-lender", "Francesco De Micheli", "DLA Piper"],
      ["debt-financing-counsel-lender", "Radina Denkova", "DLA Piper"],
      ["debt-financing-counsel-lender", "Kieran Teo", "DLA Piper"],
      ["legal-counsel-investor", "Christian Iwasko", "Fried Frank"],
      ["legal-counsel-investor", "Michelle Tong", "Fried Frank"],
      ["legal-counsel-investor", "Priya Rupal", "Fried Frank"],
      ["legal-counsel-investor", "Chris Barron", "Fried Frank"],
      ["legal-counsel-investor", "Alexander Goldsmith", "Fried Frank"],
      ["legal-counsel-investor", "Warren Wellington", "Fried Frank"],
      ["operational-and-technology-diligence-investor", "Nick Neil-Boss", "Eight Advisory"],
      ["operational-and-technology-diligence-investor", "Sam Chandrasekaran", "Eight Advisory"],
      ["operational-and-technology-diligence-investor", "Hebah Bibi", "Eight Advisory"],
      ["operational-and-technology-diligence-investor", "Himshikha Arya", "Eight Advisory"],
      ["operational-and-technology-diligence-investor", "Mike Forrest", "Eight Advisory"],
    ],
    advisors: [
      ["m-and-a-advisor-investor", "Canaccord Genuity"],
      ["legal-counsel-investor", "Fried Frank"],
      ["commercial-advisor-investor", "Roland Berger"],
      ["financial-diligence-investor", "EY"],
      ["operational-diligence-investor", "Eight Advisory"],
      ["tax-and-legal-advisor-investor", "PwC"],
      ["esg-advisor-investor", "Baringa"],
      ["insurance-advisor-investor", "Vista Insurance"],
      ["financing-provider", "Bridgepoint Credit"],
      ["debt-financing-counsel-lender", "DLA Piper"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "High-voltage independent connections provider serving data centers, battery storage, renewables, and communications infrastructure.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 20, advisorYield: 20 },
    sources: [
      {
        title: "TowerBrook Capital Partners Announces Investment in JSM",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-investment-in-jsm/",
        evidence: "TowerBrook announced a majority investment and named the deal leads, founders, chair, and eight advisor firms.",
      },
      {
        title: "DLA Piper advises Bridgepoint Credit and super senior lenders on financing for acquisition of JSM by TowerBrook",
        publisher: "DLA Piper",
        url: "https://www.dlapiper.com/en-za/news/2024/10/dla-piper-advises-bridgepoint-credit-on-acquisition-of-jsm-by-towerbrook",
        evidence: "DLA Piper identified Bridgepoint Credit as a financing provider and named the lender-counsel team.",
      },
      {
        title: "Fried Frank congratulates TowerBrook on its majority investment in JSM",
        publisher: "Fried Frank",
        url: "https://www.linkedin.com/posts/friedfrank_congratulations-to-towerbrook-capital-partners-activity-7224797010380419072-hl7b",
        evidence: "Fried Frank identified the partner, special-counsel, and associate team advising TowerBrook on JSM.",
      },
      {
        title: "Eight Advisory supported TowerBrook on its majority investment in JSM",
        publisher: "Eight Advisory",
        url: "https://www.8advisory.com/2024/07/31/eight-advisory-a-accompagne-towerbrook-capital-partners-dans-le-cadre-de-son-investissement-majoritaire-dans-jsm/",
        evidence: "Eight Advisory identified the operational and technology diligence team supporting TowerBrook on JSM.",
      },
    ],
    missingFacts: ["transaction_value", "seller_advisors", "financing_terms", "named_buy_side_advisor_individuals", "post_deal_board"],
  },
  {
    id: "pe-towerbrook-liftwerx-2024",
    lane: "towerbrook",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure"],
    tier: 0,
    name: "TowerBrook makes majority investment in LiftWerx",
    announcementDate: "2024-06-17",
    status: "completed",
    transactionType: "majority-investment",
    strategy: "towerbrook-delta",
    geography: "North America",
    target: "LiftWerx",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["continuing-owner", "LiftWerx founders and management"]],
    people: [
      ["towerbrook-deal-lead", "Alex Nisichenko", "TowerBrook"],
      ["target-founder", "Glen Aitken", "LiftWerx"],
      ["target-founder", "Joshua Rauchwerger", "LiftWerx"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Wind O&M platform using proprietary uptower crane technology for mission-critical major-component replacements.",
    relevance: { theme: 20, platform: 19, control: 20, actors: 18, advisorYield: 4 },
    sources: [
      {
        title: "TowerBrook Capital Partners Announces Investment in LiftWerx",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-investment-in-liftwerx/",
        evidence: "TowerBrook announced the majority investment and named its deal lead and LiftWerx founders.",
      },
    ],
    missingFacts: ["transaction_value", "seller_advisors", "towerbrook_advisors", "debt_financing", "post_deal_board"],
  },
  {
    id: "pe-towerbrook-aquachiara-2024",
    lane: "towerbrook",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 0,
    name: "TowerBrook makes majority investment in AQUAchiara",
    announcementDate: "2024-07-03",
    status: "completed",
    transactionType: "majority-investment",
    strategy: "towerbrook-delta",
    geography: "France",
    target: "AQUAchiara",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["continuing-owner", "AQUAchiara founder and management"]],
    people: [
      ["towerbrook-deal-lead", "Tom Redpath", "TowerBrook"],
      ["target-founder", "Nicolas Weyl", "AQUAchiara"],
      ["incoming-chair", "Laurence Paganini", "TowerBrook"],
      ["incoming-non-executive-director", "Nicolas Potier", "AQUAchiara"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Filtered-water solutions platform with an explicit buy-and-build and international expansion thesis.",
    relevance: { theme: 14, platform: 18, control: 20, actors: 17, advisorYield: 4 },
    sources: [
      {
        title: "TowerBrook Capital Partners Announces Investment in AQUAchiara",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-investment-in-aquachiara/",
        evidence: "TowerBrook announced the majority investment and named the founder, TowerBrook deal lead, incoming chair, and incoming NED.",
      },
    ],
    missingFacts: ["transaction_value", "advisors", "debt_financing", "buy_and_build_targets", "post_deal_performance"],
  },
  {
    id: "pe-towerbrook-brg-2025",
    lane: "towerbrook",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure", "smart-water"],
    tier: 0,
    name: "TowerBrook makes majority investment in Berkeley Research Group",
    announcementDate: "2025-02-27",
    status: "completed",
    transactionType: "majority-investment",
    strategy: "private-equity",
    geography: "Global",
    target: "Berkeley Research Group",
    sponsors: [["buyer-sponsor", "TowerBrook"]],
    sellers: [["seller-sponsor", "Endeavour Capital"]],
    people: [
      ["towerbrook-deal-lead", "Walter Weil", "TowerBrook"],
      ["target-ceo-president", "Tri MacDonald", "Berkeley Research Group"],
      ["outgoing-executive-chair-and-continuing-professional", "David Teece", "Berkeley Research Group"],
      ["legal-counsel-target", "Ravi Agarwal", "Kirkland & Ellis"],
      ["legal-counsel-target", "Ed Lee", "Kirkland & Ellis"],
      ["legal-counsel-target", "Rex Hupy", "Kirkland & Ellis"],
      ["legal-counsel-target", "Alice Billmire", "Kirkland & Ellis"],
      ["debt-financing-counsel-investor", "Brett Novick", "Debevoise & Plimpton"],
      ["debt-financing-counsel-investor", "Scott Selinger", "Debevoise & Plimpton"],
    ],
    advisors: [
      ["financial-advisor-investor", "Jefferies"],
      ["legal-counsel-investor", "Benesch"],
      ["debt-financing-counsel-investor", "Debevoise & Plimpton"],
      ["financing-provider", "Royal Bank of Canada"],
      ["financing-provider", "Deutsche Bank"],
      ["financing-provider", "Wells Fargo"],
      ["financing-provider", "TD"],
      ["financing-provider", "Jefferies"],
      ["financing-provider", "Sumitomo Mitsui Banking Corporation"],
      ["lead-financial-advisor-target", "JPMorgan"],
      ["financial-advisor-target", "American Discovery Capital"],
      ["legal-counsel-target", "Kirkland & Ellis"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "TowerBrook-owned expert-services and consulting platform with a large bench across energy, construction, corporate finance, disputes, and performance improvement.",
    relevance: { theme: 13, platform: 20, control: 20, actors: 20, advisorYield: 20 },
    sources: [
      {
        title: "TowerBrook Capital Partners Announces Strategic Investment in BRG",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/towerbrook-capital-partners-announces-strategic-investment-in-brg/",
        evidence: "TowerBrook announced the majority investment and named the sponsor lead, target leaders, seller, financing providers, and transaction advisors.",
      },
      {
        title: "Kirkland Advises Berkeley Research Group on Investment from TowerBrook",
        publisher: "Kirkland & Ellis",
        url: "https://www.kirkland.com/news/press-release/2025/02/kirkland-advises-berkeley-research-group-on-investment-from-towerbrook",
        evidence: "Kirkland identified its role and named the target legal team.",
      },
      {
        title: "Debevoise Advised TowerBrook in the Debt Financing Aspects of Its Strategic Investment in BRG",
        publisher: "Debevoise & Plimpton",
        url: "https://www.debevoise.com/news/2025/03/debevoise-advised-towerbrook",
        evidence: "Debevoise identified its debt-financing role and named the partner team advising TowerBrook.",
      },
    ],
    missingFacts: ["transaction_value", "towerbrook_stake", "additional_towerbrook_deal_team", "post_deal_board", "energy_practice_leaders"],
  },
  {
    id: "pe-towerbrook-langan-2023",
    lane: "towerbrook",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure"],
    tier: 0,
    name: "TowerBrook makes minority investment in Langan",
    announcementDate: "2023-10-26",
    status: "completed",
    transactionType: "minority-investment",
    strategy: "structured-opportunities",
    geography: "United States",
    target: "Langan",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["continuing-majority-owner", "Langan management and employees"]],
    people: [
      ["towerbrook-deal-lead", "Walter Weil", "TowerBrook"],
      ["target-ceo", "David T. Gockel", "Langan"],
    ],
    advisors: [
      ["lead-financial-advisor-target", "Houlihan Lokey"],
      ["financial-advisor-target", "Baird"],
      ["legal-counsel-target", "Cleary Gottlieb"],
      ["legal-counsel-investor", "Kirkland & Ellis"],
      ["financing-provider", "Blackstone Credit"],
      ["financing-provider", "CPP Investments"],
      ["financing-provider", "SMBC"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Engineering and environmental-consulting platform serving land development, public agencies, corporate clients, and the energy industry.",
    relevance: { theme: 15, platform: 19, control: 8, actors: 18, advisorYield: 20 },
    sources: [
      {
        title: "Langan announces partnership with TowerBrook Capital Partners",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/us/langan-announces-partnership-with-towerbrook-capital-partners/",
        evidence: "TowerBrook announced the minority investment and named the deal lead, target CEO, financing providers, and advisor firms.",
      },
    ],
    missingFacts: ["transaction_value", "completion_date", "towerbrook_stake", "named_advisor_individuals", "post_deal_board"],
  },
  {
    id: "pe-towerbrook-envevo-2023",
    lane: "towerbrook",
    theme: "grid-infrastructure",
    secondaryThemes: ["clean-energy-advisory"],
    tier: 0,
    name: "TowerBrook invests in Envevo",
    announcementDate: "2023-04-24",
    status: "completed",
    transactionType: "strategic-investment",
    strategy: "towerbrook-delta",
    geography: "United Kingdom",
    target: "Envevo",
    sponsors: [["investor", "TowerBrook"]],
    sellers: [["replaced-investor", "BW Ventures"]],
    people: [
      ["towerbrook-deal-lead", "Gordon Holmes", "TowerBrook"],
      ["target-ceo", "Michael Kennedy", "Envevo"],
      ["legal-counsel-investor", "Saya Sharma", "Goodwin"],
      ["legal-counsel-investor", "George Fagan", "Goodwin"],
      ["legal-counsel-investor", "Megan Gibson", "Goodwin"],
      ["finance-counsel-investor", "Patrick Clarke", "Goodwin"],
    ],
    advisors: [["legal-counsel-investor", "Goodwin"]],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "End-to-end EV-charging and renewable-energy engineering-services platform with an inorganic-growth strategy.",
    relevance: { theme: 20, platform: 19, control: 10, actors: 18, advisorYield: 14 },
    sources: [
      {
        title: "Envevo welcomes TowerBrook as a strategic investor",
        publisher: "TowerBrook",
        url: "https://www.towerbrook.com/portfolio/envevo/",
        evidence: "TowerBrook announced the investment, named its CIO and Envevo CEO, and identified BW Ventures as the investor being replaced.",
      },
      {
        title: "Goodwin Advises TowerBrook on Acquisition of Stake in Envevo",
        publisher: "Goodwin",
        url: "https://www.goodwinlaw.com/en/news-and-events/news/2023/04/04_28-goodwin-advises-towerbrook-on-acquisition-of-stake-in-envevo",
        evidence: "Goodwin identified its role and named the legal team advising TowerBrook.",
      },
    ],
    missingFacts: ["transaction_value", "towerbrook_stake", "seller_advisors", "debt_financing", "add_on_acquisitions"],
  },
  {
    id: "pe-towerbrook-envevo-srg-electrical-add-on-2024",
    lane: "towerbrook",
    theme: "grid-infrastructure",
    secondaryThemes: ["clean-energy-advisory"],
    tier: 0,
    name: "TowerBrook-backed Envevo acquires SRG Electrical",
    announcementDate: "2024-01-12",
    status: "completed",
    transactionType: "sponsor-backed-add-on",
    strategy: "towerbrook-delta",
    geography: "United Kingdom",
    target: "SRG Electrical",
    sponsors: [["portfolio-company-sponsor", "TowerBrook"]],
    sellers: [["continuing-leader", "SRG Electrical management"]],
    people: [
      ["portfolio-company-ceo", "Michael Kennedy", "Envevo"],
      ["target-leader", "Stuart Grant", "SRG Electrical"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "First add-on under TowerBrook-backed Envevo's inorganic-growth strategy, adding fleet, public, and on-street EV installation capabilities.",
    relevance: { theme: 20, platform: 10, control: 20, actors: 17, advisorYield: 3 },
    sources: [
      {
        title: "Envevo Acquires SRG Electrical",
        publisher: "Envevo",
        url: "https://envevogroup.com/envevo-acquires-srg-electrical/",
        evidence: "Envevo confirmed the completed acquisition, identified it as the first transaction in its future-growth strategy, and named the acquirer CEO and target leader.",
      },
    ],
    missingFacts: ["transaction_value", "towerbrook_deal_team_involvement", "advisors", "financing", "integration_outcomes"],
  },
  {
    id: "pe-towerbrook-envevo-aps-add-on-2024",
    lane: "towerbrook",
    theme: "grid-infrastructure",
    secondaryThemes: ["clean-energy-advisory"],
    tier: 0,
    name: "TowerBrook-backed Envevo acquires Advance Product Services",
    announcementDate: "2024-04-19",
    status: "completed",
    transactionType: "sponsor-backed-add-on",
    strategy: "towerbrook-delta",
    geography: "United Kingdom",
    target: "Advance Product Services",
    sponsors: [["portfolio-company-sponsor", "TowerBrook"]],
    sellers: [["continuing-leader", "Advance Product Services management"]],
    people: [
      ["portfolio-company-ceo", "Michael Kennedy", "Envevo"],
      ["target-leader", "Paul Horner", "Advance Product Services"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Second add-on under TowerBrook-backed Envevo's inorganic-growth strategy, adding preventative maintenance and AC/DC power-repair capabilities.",
    relevance: { theme: 20, platform: 10, control: 20, actors: 17, advisorYield: 3 },
    sources: [
      {
        title: "Envevo Acquires APS",
        publisher: "Envevo",
        url: "https://envevo.co.uk/envevo-acquires-aps/",
        evidence: "Envevo confirmed the completed acquisition, identified it as the second transaction in its future-growth strategy, and named the acquirer CEO and target leader.",
      },
    ],
    missingFacts: ["transaction_value", "towerbrook_deal_team_involvement", "advisors", "financing", "integration_outcomes"],
  },
  {
    id: "pe-clearlake-qualus-2026",
    lane: "peer-platform",
    theme: "grid-infrastructure",
    secondaryThemes: [],
    tier: 1,
    name: "Clearlake acquires Qualus from New Mountain Capital",
    announcementDate: "2026-03-25",
    completionDate: "2026-04-30",
    status: "completed",
    transactionType: "secondary-buyout",
    strategy: "private-equity",
    geography: "United States",
    target: "Qualus",
    sponsors: [
      ["buyer-sponsor", "Clearlake Capital"],
      ["seller-sponsor", "New Mountain Capital"],
    ],
    sellers: [],
    people: [
      ["buyer-dealmaker", "José E. Feliciano", "Clearlake Capital"],
      ["buyer-dealmaker", "Arta Tabaee", "Clearlake Capital"],
      ["buyer-dealmaker", "Naveen Shahani", "Clearlake Capital"],
      ["seller-dealmaker", "Joe Walker", "New Mountain Capital"],
      ["seller-dealmaker", "Lars Johansson", "New Mountain Capital"],
      ["target-ceo", "Greg Herasymuik", "Qualus"],
    ],
    advisors: [
      ["lead-financial-advisor-target-and-seller", "AEC Advisors"],
      ["co-financial-advisor-target-and-seller", "Harris Williams"],
      ["financial-advisor-buyer", "Goldman Sachs"],
      ["financial-advisor-buyer", "Houlihan Lokey"],
      ["financial-advisor-buyer", "Perella Weinberg Partners"],
      ["financial-advisor-buyer", "Stifel"],
      ["legal-counsel-target", "Simpson Thacher"],
      ["legal-counsel-buyer", "Wachtell Lipton"],
      ["financing-provider", "Apollo"],
      ["financing-provider", "Goldman Sachs Alternatives"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Pure-play grid advisory, engineering, digital, program-management, and field-services platform serving utilities and data centers.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 20, advisorYield: 20 },
    sources: [
      {
        title: "Clearlake to Acquire Qualus From New Mountain Capital",
        publisher: "Clearlake Capital",
        url: "https://clearlake.com/news/clearlake-to-acquire-qualus-a-pure-play-power-electric-grid-services-platform-from-new-mountain-capital/",
        evidence: "Clearlake announced the secondary buyout and named the target CEO, sponsor dealmakers, advisors, and financing providers.",
      },
      {
        title: "Clearlake Completes Acquisition of Qualus",
        publisher: "Clearlake Capital",
        url: "https://clearlake.com/news/clearlake-completes-acquisition-of-qualus/",
        evidence: "Clearlake confirmed completion on April 30, 2026 and disclosed additional buyer-side financial advisors.",
      },
    ],
    missingFacts: ["transaction_value", "leverage", "management_rollover", "value_creation_plan", "named_advisor_individuals"],
  },
  {
    id: "pe-eqt-scale-microgrids-2025",
    lane: "peer-platform",
    theme: "grid-infrastructure",
    secondaryThemes: ["clean-energy-advisory"],
    tier: 1,
    name: "EQT acquires Scale Microgrids from Warburg Pincus",
    announcementDate: "2025-01-09",
    status: "completed",
    transactionType: "secondary-buyout",
    strategy: "transition-infrastructure",
    geography: "North America",
    target: "Scale Microgrids",
    sponsors: [
      ["buyer-sponsor", "EQT Infrastructure"],
      ["seller-sponsor", "Warburg Pincus"],
    ],
    sellers: [],
    people: [
      ["buyer-dealmaker", "Jan Vesely", "EQT Infrastructure"],
      ["target-ceo", "Ryan Goodman", "Scale Microgrids"],
      ["seller-dealmaker", "Ryan Dalton", "Warburg Pincus"],
    ],
    advisors: [
      ["legal-counsel-buyer", "Weil Gotshal & Manges"],
      ["financial-advisor-buyer", "Guggenheim Securities"],
      ["legal-counsel-target", "Latham & Watkins"],
      ["financial-advisor-target", "Nomura Greentech"],
      ["financial-advisor-target", "Truist Securities"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Vertically integrated microgrid and distributed-energy platform addressing grid constraints, resilience, data centers, and fleet electrification.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 19, advisorYield: 14 },
    sources: [
      {
        title: "EQT to acquire distributed energy company Scale Microgrids",
        publisher: "EQT",
        url: "https://eqtgroup.com/news/eqt-to-acquire-distributed-energy-company-scale-microgrids",
        evidence: "EQT announced the acquisition from Warburg Pincus and named the buyer lead, target CEO, seller dealmaker, and both sides' advisors.",
      },
      {
        title: "Weil Advises EQT Transition Infrastructure in Acquisition of Scale Microgrids",
        publisher: "Weil Gotshal & Manges",
        url: "https://www.weil.com/articles/weil-advises-eqt-transition-infrastructure-in-acquisition-of-scale-microgrids",
        evidence: "Weil identified its role and named the multidisciplinary legal team.",
      },
      {
        title: "Scale Microgrids - EQT Portfolio",
        publisher: "EQT",
        url: "https://eqtgroup.com/about/current-portfolio/scale-microgrids",
        evidence: "EQT's current portfolio identifies Scale Microgrids as a 2025 investment and names the responsible advisor.",
      },
    ],
    missingFacts: ["transaction_value", "completion_date", "debt_financing", "management_rollover", "named_advisor_individuals"],
  },
  {
    id: "pe-eqt-seven-seas-water-2025",
    lane: "peer-platform",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 1,
    name: "EQT acquires Seven Seas Water from Morgan Stanley Infrastructure Partners",
    announcementDate: "2025-05-22",
    status: "completed",
    transactionType: "secondary-buyout",
    strategy: "infrastructure",
    geography: "Americas",
    target: "Seven Seas Water Group",
    sponsors: [
      ["buyer-sponsor", "EQT Infrastructure"],
      ["seller-sponsor", "Morgan Stanley Infrastructure Partners"],
    ],
    sellers: [],
    people: [
      ["buyer-dealmaker", "Alex Darden", "EQT Infrastructure"],
      ["target-ceo", "Henry Charrabé", "Seven Seas Water Group"],
      ["seller-dealmaker", "Alberto Donzelli", "Morgan Stanley Infrastructure Partners"],
    ],
    advisors: [
      ["financial-advisor-buyer", "Royal Bank of Canada"],
      ["legal-counsel-buyer", "A&O Shearman"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Water-as-a-Service platform owning and operating more than 220 water and wastewater plants with a long-term contracted model.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 20, advisorYield: 14 },
    sources: [
      {
        title: "EQT to acquire Seven Seas Water Group",
        publisher: "EQT",
        url: "https://eqtgroup.com/en/news/eqt-to-acquire-seven-seas-water-group-a-leading-provider-of-sustainable-water-and-wastewater-solutions-2025-05-22",
        evidence: "EQT announced the secondary buyout and named its deal lead, target CEO, and advisors.",
      },
      {
        title: "Morgan Stanley Infrastructure Partners Agrees to Sell Seven Seas Water",
        publisher: "Morgan Stanley",
        url: "https://www.morganstanley.com/press-releases/msip-agrees-to-sell-seven-seas-water",
        evidence: "MSIP identified itself as seller and named its deal lead.",
      },
      {
        title: "EQT Current Portfolio",
        publisher: "EQT",
        url: "https://eqtgroup.com/about/current-portfolio",
        evidence: "EQT's current portfolio lists Seven Seas Water Group as a 2025 EQT Infrastructure VI investment.",
      },
    ],
    missingFacts: ["transaction_value", "completion_date", "seller_advisors", "debt_financing", "management_rollover"],
  },
  {
    id: "pe-nuveen-ally-energy-2025",
    lane: "peer-platform",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure"],
    tier: 1,
    name: "Nuveen Private Equity Impact acquires majority interest in Ally Energy Solutions",
    announcementDate: "2025-09-30",
    status: "completed",
    transactionType: "majority-investment",
    strategy: "private-equity-impact",
    geography: "United States",
    target: "Ally Energy Solutions",
    sponsors: [["buyer-sponsor", "Nuveen Private Equity Impact"]],
    sellers: [["continuing-owner", "Ally Energy Solutions management"]],
    people: [["buyer-dealmaker", "Ted Maa", "Nuveen Private Equity Impact"]],
    advisors: [
      ["legal-counsel-buyer", "Gibson Dunn"],
      ["financial-advisor-target", "FMI Capital Advisors"],
      ["legal-counsel-target", "Dentons"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Energy-solutions provider delivering complex decarbonization, modernization, and resilient-power projects for commercial and industrial customers.",
    relevance: { theme: 19, platform: 19, control: 20, actors: 17, advisorYield: 17 },
    sources: [
      {
        title: "Nuveen Private Equity Impact Acquires Majority Interest in Ally Energy Solutions",
        publisher: "Nuveen",
        url: "https://www.nuveen.com/global/insights/news/2025/nuveen-private-equity-impact-acquires-majority-interest-in-ally-energy-solutions",
        evidence: "Nuveen announced the majority investment and named its deal lead and advisor firms.",
      },
    ],
    missingFacts: ["transaction_value", "seller_identity", "management_rollover", "debt_financing", "named_advisor_individuals"],
  },
  {
    id: "pe-frontenac-crom-2025",
    lane: "peer-platform",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 1,
    name: "Frontenac acquires CROM from Sciens Water",
    announcementDate: "2025-02-03",
    completionDate: "2025-01-31",
    status: "completed",
    transactionType: "secondary-buyout",
    strategy: "private-equity",
    geography: "United States",
    target: "CROM",
    sponsors: [
      ["buyer-sponsor", "Frontenac"],
      ["seller-sponsor", "Sciens Water"],
    ],
    sellers: [],
    people: [
      ["buyer-dealmaker", "Ron Kuehl", "Frontenac"],
      ["target-ceo", "Bobby Oyenarte", "CROM"],
      ["executive-chair", "Jim McGivern", "CROM"],
    ],
    advisors: [["financial-advisor-target", "Raymond James"]],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Water-infrastructure services platform using a rapid buy-and-build strategy across tank construction, restoration, and maintenance.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 19, advisorYield: 10 },
    sources: [
      {
        title: "Frontenac Welcomes Water Infrastructure Solutions Provider CROM",
        publisher: "Frontenac",
        url: "https://frontenac.com/frontenac-welcomes-water-infrastructure-solutions-provider-crom-as-its-newest-portfolio-company/",
        evidence: "Frontenac announced the acquisition from Sciens Water, named the target CEO, buyer dealmaker, executive chair, and financial advisor, and confirmed the closing date.",
      },
      {
        title: "CROM portfolio profile",
        publisher: "Frontenac",
        url: "https://frontenac.com/portfolio/crom/",
        evidence: "Frontenac's portfolio profile identifies three 2025 add-ons and one January 2026 add-on.",
      },
    ],
    missingFacts: ["transaction_value", "additional_deal_team", "legal_advisors", "debt_financing", "add_on_values"],
  },
  {
    id: "pe-wind-point-sigma-2025",
    lane: "peer-platform",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 1,
    name: "Wind Point Partners acquires Sigma",
    announcementDate: "2025-04-10",
    status: "completed",
    transactionType: "platform-acquisition",
    strategy: "private-equity",
    geography: "North America",
    target: "Sigma Companies International",
    sponsors: [["buyer-sponsor", "Wind Point Partners"]],
    sellers: [["continuing-owner", "Sigma management"]],
    people: [
      ["buyer-dealmaker", "Peter Leemputte", "Wind Point Partners"],
      ["target-ceo", "Victor Pais", "Sigma Companies International"],
      ["target-president", "Larry Rybacki", "Sigma Companies International"],
      ["incoming-chair", "Frank Firsching", "Sigma Companies International"],
    ],
    advisors: [
      ["legal-counsel-buyer", "Kirkland & Ellis"],
      ["transaction-advisor-buyer", "KPMG"],
      ["financial-advisor-target", "Janney Montgomery Scott"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Waterworks-products platform with an explicit product-line expansion and complementary-M&A value-creation plan.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 18, advisorYield: 17 },
    sources: [
      {
        title: "Wind Point Partners Acquires Sigma",
        publisher: "Wind Point Partners",
        url: "https://www.wppartners.com/wind-point-partners-acquires-sigma/",
        evidence: "Wind Point announced the platform acquisition and named management, its deal lead, incoming chair, and advisors.",
      },
      {
        title: "SIGMA Acquires Masonry Supply",
        publisher: "Wind Point Partners",
        url: "https://www.wppartners.com/sigma-acquires-masonry-supply-inc/",
        evidence: "Wind Point documented Sigma's January 2026 add-on and the sponsor's acquisition-led value-creation thesis.",
      },
    ],
    missingFacts: ["transaction_value", "seller_identity", "debt_financing", "named_advisor_individuals", "add_on_values"],
  },
  {
    id: "pe-wind-point-sigma-masonry-supply-add-on-2026",
    lane: "peer-add-on",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 2,
    name: "Wind Point-backed SIGMA acquires Masonry Supply",
    announcementDate: "2026-01-07",
    status: "completed",
    transactionType: "sponsor-backed-add-on",
    strategy: "private-equity",
    geography: "United States",
    target: "Masonry Supply",
    sponsors: [["portfolio-company-sponsor", "Wind Point Partners"]],
    sellers: [["continuing-leader", "Masonry Supply management"]],
    people: [
      ["sponsor-dealmaker", "Peter Leemputte", "Wind Point Partners"],
      ["acquirer-ceo", "Mark Carpenter", "Sigma Companies International"],
      ["target-founder", "Terry Keen", "Masonry Supply"],
      ["continuing-commercial-lead", "Jacob Nash", "Masonry Supply"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "First disclosed add-on under Wind Point's SIGMA value-creation plan, expanding waterworks products and Southeast fulfillment.",
    relevance: { theme: 20, platform: 11, control: 20, actors: 18, advisorYield: 3 },
    sources: [
      {
        title: "SIGMA Acquires Masonry Supply",
        publisher: "Wind Point Partners",
        url: "https://www.wppartners.com/sigma-acquires-masonry-supply-inc/",
        evidence: "Wind Point identified SIGMA as its portfolio company and named the sponsor dealmaker, acquirer CEO, target founder, and continuing commercial lead.",
      },
    ],
    missingFacts: ["transaction_value", "advisors", "financing", "ownership_rollover", "integration_plan"],
  },
  {
    id: "pe-brookfield-antin-origis-2025",
    lane: "peer-platform",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure"],
    tier: 1,
    name: "Brookfield and Antin commit more than $1 billion to Origis Energy",
    announcementDate: "2025-01-15",
    status: "completed",
    transactionType: "growth-investment",
    strategy: "infrastructure",
    geography: "United States",
    target: "Origis Energy",
    sponsors: [
      ["new-investor", "Brookfield"],
      ["existing-majority-sponsor", "Antin Infrastructure Partners"],
    ],
    sellers: [],
    people: [],
    advisors: [],
    value: { amountMillions: 1000, currency: "USD", basis: "aggregate_commitment", disclosed: true },
    thesis:
      "Scaled solar and battery-storage IPP receiving sponsor capital to accelerate development and portfolio growth.",
    relevance: { theme: 20, platform: 20, control: 10, actors: 20, advisorYield: 4 },
    sources: [
      {
        title: "Origis Energy Secures $1+ Billion Strategic Investment from Brookfield and Antin",
        publisher: "Origis Energy",
        url: "https://www.prnewswire.com/news-releases/origis-energy-secures-1-billion-strategic-investment-from-brookfield-and-antin-302351327.html",
        evidence: "Origis announced an aggregate investment exceeding $1 billion from Brookfield and existing majority sponsor Antin.",
      },
    ],
    missingFacts: ["ownership_percentages", "named_dealmakers", "advisors", "debt_financing", "capital_drawdown_status"],
  },
  {
    id: "pe-axa-ilos-2025",
    lane: "peer-platform",
    theme: "clean-energy-advisory",
    secondaryThemes: [],
    tier: 1,
    name: "AXA IM Alts agrees to acquire 60% of ILOS Projects",
    announcementDate: "2025-04-14",
    status: "closing-status-unverified",
    transactionType: "majority-investment",
    strategy: "infrastructure",
    geography: "Europe",
    target: "ILOS Projects",
    sponsors: [
      ["buyer-sponsor", "AXA IM Alts"],
      ["seller-sponsor", "Omnes Capital"],
    ],
    sellers: [["continuing-owner", "ILOS New Energy founders"]],
    people: [
      ["buyer-dealmaker", "Mark Gilligan", "AXA IM Alts"],
      ["target-founder", "Nikolaus Krane", "ILOS Projects"],
      ["target-founder", "Michael Winter", "ILOS Projects"],
      ["seller-dealmaker", "Yannic Trüb", "Omnes Capital"],
    ],
    advisors: [],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Pan-European renewable IPP platform transitioning between institutional sponsors while founders and management remain invested.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 19, advisorYield: 4 },
    sources: [
      {
        title: "AXA IM Alts acquires a 60% stake in ILOS Projects",
        publisher: "AXA IM Alts",
        url: "https://alts.axa-im.com/media-centre/axa-im-alts-acquires-60-stake-ilos-projects-fast-growing-pan-european-renewable-energy-ipp",
        evidence: "AXA IM Alts announced the acquisition of a 60% stake and named the buyer infrastructure lead, founders, and seller dealmaker.",
      },
    ],
    missingFacts: ["transaction_value", "closing_status", "named_dealmakers", "advisors", "debt_financing"],
  },
  {
    id: "pe-ardian-energia-2025",
    lane: "peer-platform",
    theme: "clean-energy-advisory",
    secondaryThemes: ["grid-infrastructure"],
    tier: 1,
    name: "Ardian agrees to acquire Energia Group from I Squared Capital",
    announcementDate: "2025-10-06",
    status: "pending",
    transactionType: "secondary-buyout",
    strategy: "infrastructure",
    geography: "Ireland",
    target: "Energia Group",
    sponsors: [
      ["buyer-sponsor", "Ardian"],
      ["seller-sponsor", "I Squared Capital"],
    ],
    sellers: [],
    people: [
      ["buyer-dealmaker", "Juan Angoitia-Grijalba", "Ardian"],
      ["buyer-dealmaker", "William Briggs", "Ardian"],
      ["buyer-dealmaker", "Alexis Ballif", "Ardian"],
      ["buyer-dealmaker", "Alvaro Sanz Carrasqueño", "Ardian"],
      ["buyer-dealmaker", "Matthias Hübener", "Ardian"],
      ["buyer-dealmaker", "Niranjan Bhardwaj", "Ardian"],
      ["buyer-dealmaker", "Angel Sanchez-Cantalejo", "Ardian"],
      ["seller-dealmaker", "Mohamed El Gazzar", "I Squared Capital"],
      ["target-ceo", "Ian Thom", "Energia Group"],
    ],
    advisors: [
      ["financial-advisor-buyer", "Evercore"],
      ["legal-counsel-buyer", "Kirkland & Ellis"],
      ["irish-legal-counsel-buyer", "Matheson"],
      ["financial-tax-technical-and-environmental-diligence-buyer", "Alvarez & Marsal"],
      ["commercial-diligence-buyer", "Afry"],
      ["commercial-diligence-buyer", "Timera"],
      ["regulatory-diligence-buyer", "NERA"],
      ["financial-advisor-seller", "Morgan Stanley"],
      ["financial-advisor-seller", "Barclays"],
      ["financial-advisor-seller", "Santander"],
      ["legal-counsel-seller", "Simpson Thacher"],
      ["irish-legal-counsel-seller", "Arthur Cox"],
    ],
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    thesis:
      "Integrated Irish energy platform with generation, renewables, flexible assets, and customer operations changing sponsor ownership.",
    relevance: { theme: 20, platform: 20, control: 20, actors: 20, advisorYield: 20 },
    sources: [
      {
        title: "Ardian signs agreement to acquire Energia Group",
        publisher: "Ardian",
        url: "https://www.ardian.com/news-insights/press-releases/ardian-signs-agreement-i-squared-capital-acquire-energia-group-leading",
        evidence: "Ardian agreed to acquire 100% of Energia Group and named the buyer team, seller lead, target CEO, and both sides' advisors and diligence providers.",
      },
      {
        title: "Kirkland Advises Ardian on Acquisition of Energia Group",
        publisher: "Kirkland & Ellis",
        url: "https://www.kirkland.com/news/press-release/2025/10/kirkland-advises-ardian-on-acquisition-of-energia-group",
        evidence: "Kirkland identified itself as legal counsel to Ardian.",
      },
    ],
    missingFacts: ["transaction_value", "closing_status", "debt_financing", "management_rollover", "named_advisor_individuals"],
  },
  {
    id: "pe-xpv-smartcover-exit-2025",
    lane: "peer-exit",
    theme: "smart-water",
    secondaryThemes: [],
    tier: 2,
    name: "XPV Water Partners sells SmartCover Systems to Badger Meter",
    announcementDate: "2025-01-31",
    completionDate: "2025-01-31",
    status: "completed",
    transactionType: "sponsor-exit-to-strategic",
    strategy: "private-equity",
    geography: "United States",
    target: "SmartCover Systems",
    sponsors: [["seller-sponsor", "XPV Water Partners"]],
    sellers: [],
    people: [],
    advisors: [["financial-advisor-target", "Houlihan Lokey"]],
    value: { amountMillions: 185, currency: "USD", basis: "purchase_price", disclosed: true },
    thesis:
      "Sponsor exit establishes a disclosed valuation benchmark for wastewater collection-system monitoring and analytics.",
    relevance: { theme: 20, platform: 12, control: 20, actors: 17, advisorYield: 12 },
    sources: [
      {
        title: "XPV Water Partners Announces Sale of SmartCover to Badger Meter",
        publisher: "XPV Water Partners",
        url: "https://xpvwaterpartners.com/insights/news/2025/01/31/xpv-water-partners-announces-sale-of-smartcover-to-badger-meter",
        evidence: "XPV announced its completed sale of SmartCover to Badger Meter.",
      },
      {
        title: "Badger Meter Extends BlueEdge Suite with Acquisition of SmartCover Systems",
        publisher: "Badger Meter",
        url: "https://www.badgermeter.com/newsroom/smartcover/",
        evidence: "Badger Meter disclosed the $185 million purchase price.",
      },
    ],
    missingFacts: ["xpv_deal_team", "legal_advisors", "entry_value", "returns", "valuation_multiple"],
  },
  {
    id: "pe-golden-gate-dmc-power-exit-2025",
    lane: "peer-exit",
    theme: "grid-infrastructure",
    secondaryThemes: [],
    tier: 2,
    name: "Golden Gate Capital sells DMC Power to Hubbell",
    announcementDate: "2025-08-12",
    completionDate: "2025-10-01",
    status: "completed",
    transactionType: "sponsor-exit-to-strategic",
    strategy: "private-equity",
    geography: "United States",
    target: "DMC Power",
    sponsors: [["seller-sponsor", "Golden Gate Capital"]],
    sellers: [],
    people: [
      ["seller-dealmaker", "Javier Puig", "Golden Gate Capital"],
      ["target-ceo", "Tony Ward", "DMC Power"],
      ["buyer-ceo", "Gerben Bakker", "Hubbell"],
      ["buyer-business-president", "Greg Gumbs", "Hubbell"],
    ],
    advisors: [
      ["financial-advisor-buyer", "Stephens"],
      ["legal-counsel-buyer", "Holland & Knight"],
      ["financial-advisor-seller", "Harris Williams"],
      ["financial-advisor-seller", "Lincoln International"],
      ["legal-counsel-seller", "Paul Weiss"],
    ],
    value: { amountMillions: 825, currency: "USD", basis: "cash_purchase_price", disclosed: true },
    thesis:
      "Sponsor exit establishes a disclosed benchmark for substation connector systems and grid-infrastructure products.",
    relevance: { theme: 20, platform: 13, control: 20, actors: 19, advisorYield: 20 },
    sources: [
      {
        title: "Hubbell Incorporated Completes Acquisition of DMC Power",
        publisher: "Hubbell",
        url: "https://hubbell.gcs-web.com/static-files/f6d34440-8b3f-432c-9797-fb60db9f6b30",
        evidence: "Hubbell's filed announcement confirmed completion on October 1, 2025 and described the acquisition financing.",
      },
      {
        title: "Hubbell to Acquire DMC Power",
        publisher: "Golden Gate Capital",
        url: "https://goldengatecap.com/hubbell-to-acquire-dmc-power/",
        evidence: "Golden Gate's official release disclosed the $825 million price and named the seller dealmaker, target and buyer leaders, financing, and both sides' advisors.",
      },
    ],
    missingFacts: ["additional_golden_gate_deal_team", "entry_value", "returns", "valuation_multiple", "named_advisor_individuals"],
  },
];

const laneOrder = {
  towerbrook: 0,
  "peer-platform": 1,
  "peer-add-on": 2,
  "peer-exit": 3,
};

function monthsSince(date) {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${generatedAt}T00:00:00Z`);
  return Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
}

function recencyScore(date) {
  const months = monthsSince(date);
  if (months <= 6) return 100;
  if (months <= 12) return 85;
  if (months <= 24) return 65;
  if (months <= 36) return 40;
  return 15;
}

function entity(name, kind) {
  const lookup = kind === "person" ? expertByName : companyByName;
  return {
    name,
    canonical_id: lookup.get(name.toLowerCase()) ?? null,
    canonical_match_status: lookup.has(name.toLowerCase()) ? "exact_name_match" : "unresolved",
  };
}

function normalizeOrganizations(items) {
  return items.map(([role, name]) => ({ role, ...entity(name, "company") }));
}

function normalize(deal) {
  const r = deal.relevance;
  const towerbrookFit = deal.lane === "towerbrook" ? 100 : deal.lane === "peer-platform" ? 80 : 55;
  const platformControl = Math.round((r.platform + r.control) * 2.5);
  const expertYield = Math.min(100, Math.round(r.actors * 3 + r.advisorYield * 2));
  const recentActivity = recencyScore(deal.completionDate ?? deal.announcementDate);
  const missingInformationValue = Math.min(100, deal.missingFacts.length * 18);
  const researchPriority = Math.round(
    towerbrookFit * 0.3 +
      r.theme * 5 * 0.2 +
      platformControl * 0.2 +
      recentActivity * 0.15 +
      expertYield * 0.1 +
      missingInformationValue * 0.05,
  );

  return {
    ...deal,
    target: entity(deal.target, "company"),
    sponsors: normalizeOrganizations(deal.sponsors),
    sellers: normalizeOrganizations(deal.sellers),
    advisors: normalizeOrganizations(deal.advisors),
    people: deal.people.map(([role, name, organization]) => ({
      role,
      ...entity(name, "person"),
      organization,
      organization_canonical_id: companyByName.get(organization.toLowerCase()) ?? null,
    })),
    scores: {
      towerbrook_or_peer_fit: towerbrookFit,
      theme_relevance: r.theme * 5,
      platform_and_control: platformControl,
      recent_activity: recentActivity,
      expert_and_advisor_yield: expertYield,
      missing_information_value: missingInformationValue,
      research_priority: researchPriority,
    },
    review: {
      status: "needs_review",
      reviewer: null,
      notes: "PE-deal research candidate. Verify before promotion to canonical deals, experts, companies, or graph relationships.",
    },
    followUpSearches: [
      ...deal.missingFacts.map((fact) => `"${deal.target}" ${fact.replaceAll("_", " ")}`),
      `"${deal.target}" private equity deal team`,
      `"${deal.target}" transaction advisors`,
      `"${deal.target}" add-on acquisition`,
    ],
  };
}

const candidates = deals
  .map(normalize)
  .sort(
    (a, b) =>
      laneOrder[a.lane] - laneOrder[b.lane] ||
      b.scores.research_priority - a.scores.research_priority,
  );

const summarize = (items) => ({
  candidates: items.length,
  by_theme: Object.fromEntries(
    ["clean-energy-advisory", "grid-infrastructure", "smart-water"].map((theme) => [
      theme,
      items.filter((candidate) => candidate.theme === theme).length,
    ]),
  ),
  named_people: new Set(items.flatMap((candidate) => candidate.people.map((person) => person.name))).size,
  named_advisors: new Set(items.flatMap((candidate) => candidate.advisors.map((advisor) => advisor.name))).size,
  unresolved_people: items.flatMap((candidate) => candidate.people).filter((person) => !person.canonical_id).length,
  unresolved_organizations: items
    .flatMap((candidate) => [candidate.target, ...candidate.sponsors, ...candidate.sellers, ...candidate.advisors])
    .filter((organization) => !organization.canonical_id).length,
});

const towerbrookDeals = candidates.filter((candidate) => candidate.lane === "towerbrook");
const peerDeals = candidates.filter((candidate) => candidate.lane !== "towerbrook");

const output = {
  schema_version: "private-equity-deal-census-candidates.v1",
  generated_at: generatedAt,
  generated_by: "scripts/build-private-equity-deal-census.mjs",
  review_policy:
    "This file contains public-source PE-deal research candidates. It must not write directly to canonical deals, experts, companies, or graph relationships.",
  scope: {
    objective:
      "Prioritize TowerBrook and peer private-equity deals to discover actionable dealmakers, operators, advisors, service providers, and investment targets.",
    lane_order: ["towerbrook", "peer-platform", "peer-add-on", "peer-exit"],
    exclusions:
      "Pure strategic M&A with no PE sponsor involvement is excluded from the primary queue and should be retained only in a separate comparable-deals view.",
  },
  score_method: {
    research_priority:
      "30% TowerBrook/peer fit + 20% theme relevance + 20% platform/control significance + 15% recent activity + 10% expert/advisor yield + 5% missing-information value",
    display_rule:
      "TowerBrook deals always appear before peer-fund deals; scores rank deals within each lane.",
  },
  coverage: {
    total_candidates: candidates.length,
    towerbrook: summarize(towerbrookDeals),
    peers: summarize(peerDeals),
    by_lane: Object.fromEntries(
      Object.keys(laneOrder).map((lane) => [lane, candidates.filter((candidate) => candidate.lane === lane).length]),
    ),
  },
  priority_queues: {
    towerbrook_deals: towerbrookDeals.map((candidate) => candidate.id),
    peer_platform_deals: candidates.filter((candidate) => candidate.lane === "peer-platform").map((candidate) => candidate.id),
    peer_add_ons: candidates.filter((candidate) => candidate.lane === "peer-add-on").map((candidate) => candidate.id),
    peer_exits: candidates.filter((candidate) => candidate.lane === "peer-exit").map((candidate) => candidate.id),
  },
  candidates,
};

writeFileSync(join(root, "data/private-equity-deal-census-candidates.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${candidates.length} private-equity deal census candidate(s) to data/private-equity-deal-census-candidates.json`);
