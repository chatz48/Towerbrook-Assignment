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

const investments = [
  {
    id: "census-aes-gip-eqt-2026",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "GIP- and EQT-led consortium agrees to acquire AES",
    announcementDate: "2026-03-02",
    status: "pending",
    geography: "Americas",
    transactionType: "take-private",
    value: { amountMillions: 33400, currency: "USD", basis: "enterprise_value", disclosed: true },
    target: "AES",
    parties: [
      ["investor", "Global Infrastructure Partners"],
      ["investor", "EQT Infrastructure"],
      ["co-investor", "CalPERS"],
      ["co-investor", "Qatar Investment Authority"],
    ],
    people: [
      ["target-ceo", "Andrés Gluski", "AES"],
      ["investor-lead", "Adebayo Ogunlesi", "Global Infrastructure Partners"],
      ["investor-lead", "Masoud Homayoun", "EQT Infrastructure"],
      ["target-chair", "Jay Morse", "AES"],
    ],
    advisors: [
      ["financial-advisor-target", "J.P. Morgan"],
      ["financial-advisor-target", "Wells Fargo Securities"],
      ["legal-counsel-target", "Skadden"],
      ["debt-legal-advisor-target", "Davis Polk"],
      ["financial-advisor-investor", "Goldman Sachs"],
      ["financial-advisor-investor", "Citi"],
      ["legal-counsel-investor", "Kirkland & Ellis"],
      ["legal-counsel-investor", "Simpson Thacher"],
    ],
    relevance: { theme: 20, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "Consortium Led by Global Infrastructure Partners and EQT Agrees to Acquire AES",
        publisher: "AES",
        url: "https://www.aes.com/energy-insights/consortium-led-global-infrastructure-partners-and-eqt-agrees-acquire-aes",
        evidence: "The consortium agreed to acquire AES for an enterprise value of approximately $33.4 billion and named the principal investors, executives and advisors.",
      },
    ],
    missingFacts: ["individual_financial_advisors", "full_named_legal_team", "financing_terms", "regulatory_approval_status"],
  },
  {
    id: "census-constellation-calpine-2025",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "Constellation acquires Calpine",
    announcementDate: "2025-01-10",
    completionDate: "2026-01-07",
    status: "completed",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 26600, currency: "USD", basis: "net_purchase_price", disclosed: true },
    target: "Calpine",
    parties: [
      ["buyer", "Constellation Energy"],
      ["seller", "Energy Capital Partners"],
      ["seller", "CPP Investments"],
      ["seller", "Access Industries"],
    ],
    people: [
      ["buyer-ceo", "Joe Dominguez", "Constellation Energy"],
      ["target-ceo", "Andrew Novotny", "Calpine"],
      ["seller-dealmaker", "Tyler Reeder", "Energy Capital Partners"],
    ],
    advisors: [
      ["financial-advisor-buyer", "Lazard"],
      ["financial-advisor-buyer", "J.P. Morgan"],
      ["legal-counsel-buyer", "Kirkland & Ellis"],
      ["financial-advisor-seller", "Evercore"],
      ["financial-advisor-seller", "Morgan Stanley"],
      ["financial-advisor-seller", "Goldman Sachs"],
      ["financial-advisor-seller", "Barclays"],
      ["legal-counsel-seller", "Latham & Watkins"],
      ["legal-counsel-seller", "White & Case"],
    ],
    relevance: { theme: 17, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "Constellation To Acquire Calpine",
        publisher: "Constellation Energy",
        url: "https://investors.constellationenergy.com/news-releases/news-release-details/constellation-acquire-calpine-creates-americas-leading-producer",
        evidence: "Constellation announced the $26.6 billion net purchase price and identified the principal parties, executives and advisor firms.",
      },
      {
        title: "Constellation Completes Calpine Transaction",
        publisher: "Calpine",
        url: "https://www.calpine.com/constellation-completes-calpine-transaction-powering-americas-clean-energy-future/",
        evidence: "Calpine reported that the transaction completed on January 7, 2026.",
      },
    ],
    missingFacts: ["named_bankers", "full_named_legal_team", "integration_leadership"],
  },
  {
    id: "census-brookfield-neoen-2024",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "Brookfield-led consortium takes Neoen private",
    announcementDate: "2024-05-30",
    completionDate: "2025-04-04",
    status: "completed",
    geography: "Global / France",
    transactionType: "take-private",
    value: { amountMillions: 6100, currency: "EUR", basis: "equity_value", disclosed: true },
    target: "Neoen",
    parties: [
      ["buyer", "Brookfield Renewable"],
      ["co-investor", "Temasek"],
      ["seller", "Impala"],
      ["seller", "Fonds Stratégique de Participations"],
      ["seller", "Cartusia"],
    ],
    people: [["founder-seller", "Xavier Barbaro", "Neoen"]],
    advisors: [
      ["lender-legal-advisor", "Ashurst"],
      ["management-legal-advisor", "CMS"],
      ["co-investor-legal-advisor", "Cleary Gottlieb"],
    ],
    relevance: { theme: 20, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "Brookfield enters into exclusive negotiations to acquire Neoen",
        publisher: "Brookfield Renewable",
        url: "https://bep.brookfield.com/brookfield-enters-exclusive-negotiations-impala-and-other-shareholders-acquire-majority-stake-neoen",
        evidence: "Brookfield's offer implied an equity value of €6.1 billion for Neoen and identified the principal consortium and sellers.",
      },
      {
        title: "Brookfield announces successful completion of the tender offer for Neoen",
        publisher: "Brookfield Renewable Holdings",
        url: "https://www.globenewswire.com/news-release/2025/03/19/3045277/0/en/brookfield-announces-successful-completion-of-the-tender-offer-for-neoen-with-mandatory-squeeze-out-to-follow.html",
        evidence: "Brookfield announced completion of the tender offer and the mandatory squeeze-out process.",
      },
    ],
    missingFacts: ["lead_financial_advisors", "brookfield_named_dealmakers", "seller_named_dealmakers"],
  },
  {
    id: "census-alphabet-intersect-2025",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "Alphabet agrees to acquire Intersect",
    announcementDate: "2025-12-22",
    status: "pending",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 4750, currency: "USD", basis: "cash_plus_debt", disclosed: true },
    target: "Intersect",
    parties: [
      ["buyer", "Alphabet"],
      ["seller", "TPG Rise Climate"],
      ["seller", "Climate Adaptive Infrastructure"],
      ["seller", "Greenbelt Capital Partners"],
    ],
    people: [
      ["target-ceo", "Sheldon Kimber", "Intersect"],
      ["seller-legal-counsel", "Kristin Mendoza", "Kirkland & Ellis"],
      ["seller-legal-counsel", "Ahmed Sidik", "Kirkland & Ellis"],
      ["seller-legal-counsel", "Qasim Rasool", "Kirkland & Ellis"],
      ["seller-legal-counsel", "Drew Stuyvenberg", "Kirkland & Ellis"],
      ["seller-legal-counsel", "Erin Bartlett", "Kirkland & Ellis"],
    ],
    advisors: [["legal-counsel-seller", "Kirkland & Ellis"]],
    relevance: { theme: 18, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "Alphabet Announces Agreement to Acquire Intersect",
        publisher: "Intersect",
        url: "https://www.intersect.com/news/alphabet-announces-agreement-to-acquire-intersect-to-advance-u-s-energy-innovation",
        evidence: "Alphabet agreed to acquire Intersect for $4.75 billion in cash plus the assumption of debt.",
      },
      {
        title: "Kirkland Advises Intersect Investors on Sale to Alphabet",
        publisher: "Kirkland & Ellis",
        url: "https://www.kirkland.com/news/press-release/2025/12/kirkland-advises-tpg-rise-climate-adaptive-infrastructure-on-sale-of-intersect",
        evidence: "Kirkland identified the selling investor group and named the legal team advising the sellers.",
      },
    ],
    missingFacts: ["buyer_financial_advisor", "buyer_legal_counsel", "seller_financial_advisor", "closing_status"],
  },
  {
    id: "census-ardian-energia-2025",
    theme: "clean-energy-advisory",
    tier: 2,
    name: "Ardian agrees to acquire Energia Group",
    announcementDate: "2025-10-06",
    status: "pending",
    geography: "Ireland",
    transactionType: "acquisition",
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    target: "Energia Group",
    parties: [
      ["buyer", "Ardian"],
      ["seller", "I Squared Capital"],
    ],
    people: [],
    advisors: [["legal-counsel-buyer", "Kirkland & Ellis"]],
    relevance: { theme: 20, controlPlatform: 15, strategic: 13, actors: 9, followOn: 8 },
    sources: [
      {
        title: "Ardian signs agreement to acquire Energia Group",
        publisher: "Ardian",
        url: "https://www.ardian.com/news-insights/press-releases/ardian-signs-agreement-i-squared-capital-acquire-energia-group-leading",
        evidence: "Ardian agreed to acquire 100% of Energia Group from I Squared Capital.",
      },
      {
        title: "Kirkland Advises Ardian on Acquisition of Energia Group",
        publisher: "Kirkland & Ellis",
        url: "https://www.kirkland.com/news/press-release/2025/10/kirkland-advises-ardian-on-acquisition-of-energia-group",
        evidence: "Kirkland identified itself as legal counsel to Ardian.",
      },
    ],
    missingFacts: ["transaction_value", "closing_status", "named_investment_team", "seller_advisors", "financing"],
  },
  {
    id: "census-firstenergy-transmission-brookfield-2024",
    theme: "grid-infrastructure",
    tier: 1,
    name: "Brookfield acquires additional 30% of FirstEnergy Transmission",
    announcementDate: "2024-03-25",
    completionDate: "2024-03-25",
    status: "completed",
    geography: "United States",
    transactionType: "minority-investment",
    value: { amountMillions: 3500, currency: "USD", basis: "stake_purchase_price", disclosed: true },
    target: "FirstEnergy Transmission",
    parties: [
      ["investor", "Brookfield"],
      ["seller", "FirstEnergy"],
    ],
    people: [],
    advisors: [],
    relevance: { theme: 20, controlPlatform: 10, strategic: 15, actors: 9, followOn: 10 },
    sources: [
      {
        title: "FirstEnergy Closes on $3.5 Billion FirstEnergy Transmission 30% Interest Sale",
        publisher: "FirstEnergy",
        url: "https://investors.firstenergycorp.com/investor-materials/news-releases/news-details/2024/FirstEnergy-Closes-on-3.5-Billion-FirstEnergy-Transmission-LLC-30-Interest-Sale/default.aspx",
        evidence: "FirstEnergy completed the sale of an additional 30% interest in FirstEnergy Transmission to Brookfield for $3.5 billion.",
      },
    ],
    missingFacts: ["named_investment_team", "financial_advisors", "legal_counsel", "stake_ownership_after_transaction"],
  },
  {
    id: "census-eaton-fibrebond-2025",
    theme: "grid-infrastructure",
    tier: 1,
    name: "Eaton acquires Fibrebond",
    announcementDate: "2025-03-11",
    completionDate: "2025-04-01",
    status: "completed",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 1400, currency: "USD", basis: "purchase_price", disclosed: true },
    target: "Fibrebond",
    parties: [["buyer", "Eaton"]],
    people: [["buyer-operator", "Mike Yelton", "Eaton"]],
    advisors: [["legal-counsel-seller", "Latham & Watkins"]],
    relevance: { theme: 16, controlPlatform: 15, strategic: 13, actors: 9, followOn: 8 },
    sources: [
      {
        title: "Eaton completes acquisition of Fibrebond",
        publisher: "Eaton",
        url: "https://www.eaton.com/us/en-us/company/news-insights/news-releases/2025/eaton-completes-acquisition-of-fibrebond.html",
        evidence: "Eaton paid $1.4 billion for Fibrebond, a provider of pre-integrated modular power enclosures for data center, industrial and utility customers.",
      },
      {
        title: "Latham & Watkins Advises Fibrebond in Acquisition by Eaton",
        publisher: "Latham & Watkins",
        url: "https://www.lw.com/en/news/latham-watkins-advises-fibrebond-corporation-in-acquisition-by-eaton",
        evidence: "Latham & Watkins identified itself as counsel to Fibrebond.",
      },
    ],
    missingFacts: ["seller_identity", "buyer_financial_advisor", "named_latham_team", "management_retention"],
  },
  {
    id: "census-hubbell-dmc-power-2025",
    theme: "grid-infrastructure",
    tier: 2,
    name: "Hubbell acquires DMC Power",
    announcementDate: "2025-08-12",
    completionDate: "2025-10-01",
    status: "completed",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 825, currency: "USD", basis: "purchase_price", disclosed: true },
    target: "DMC Power",
    parties: [
      ["buyer", "Hubbell"],
      ["seller", "Golden Gate Capital"],
    ],
    people: [
      ["buyer-ceo", "Gerben Bakker", "Hubbell"],
      ["buyer-operator", "Greg Gumbs", "Hubbell"],
      ["seller-dealmaker", "Javier Puig", "Golden Gate Capital"],
      ["target-ceo", "Tony Ward", "DMC Power"],
    ],
    advisors: [
      ["financial-advisor-buyer", "Stephens"],
      ["legal-counsel-buyer", "Holland & Knight"],
      ["financial-advisor-seller", "Harris Williams"],
      ["financial-advisor-seller", "Lincoln International"],
      ["legal-counsel-seller", "Paul Weiss"],
    ],
    relevance: { theme: 20, controlPlatform: 15, strategic: 14, actors: 9, followOn: 9 },
    sources: [
      {
        title: "Hubbell to Acquire DMC Power",
        publisher: "Hubbell",
        url: "https://hubbell.gcs-web.com/news-releases/news-release-details/hubbell-acquire-dmc-power",
        evidence: "Hubbell agreed to acquire DMC Power for $825 million and identified executives, the seller and advisor firms.",
      },
    ],
    missingFacts: ["named_bankers", "named_lawyers", "seller_entry_investment", "post_close_management"],
  },
  {
    id: "census-taqa-transmission-investment-2025",
    theme: "grid-infrastructure",
    tier: 2,
    name: "TAQA acquires Transmission Investment",
    announcementDate: "2025-04-17",
    status: "completed",
    geography: "United Kingdom",
    transactionType: "acquisition",
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    target: "Transmission Investment",
    parties: [["buyer", "TAQA"]],
    people: [],
    advisors: [],
    relevance: { theme: 20, controlPlatform: 15, strategic: 15, actors: 9, followOn: 10 },
    sources: [
      {
        title: "TAQA Acquires Leading UK Electricity Transmission Development and Services Company",
        publisher: "TAQA Transmission",
        url: "https://taqatransmission.com/node/122",
        evidence: "TAQA acquired 100% of Transmission Investment, a UK electricity transmission development and services platform.",
      },
      {
        title: "UK Final Order for TAQA Acquisition of Transmission Investment",
        publisher: "UK Government",
        url: "https://www.gov.uk/government/publications/acquisition-of-100-of-shareholding-in-transmission-investment-holdings-limited-by-taqa-transmission-holding-llc/acquisition-of-100-of-shareholding-in-transmission-investment-holdings-limited-by-taqa-transmission-holding-llc",
        evidence: "The UK government approved the acquisition subject to national-security conditions.",
      },
    ],
    missingFacts: ["transaction_value", "seller_identity", "named_investment_team", "financial_advisors", "legal_counsel"],
  },
  {
    id: "census-clearlake-qualus-2026",
    theme: "grid-infrastructure",
    tier: 2,
    name: "Clearlake agrees to acquire Qualus",
    announcementDate: "2026-03-25",
    status: "pending",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: null, currency: null, basis: "not_disclosed", disclosed: false },
    target: "Qualus",
    parties: [
      ["buyer", "Clearlake Capital"],
      ["seller", "New Mountain Capital"],
    ],
    people: [],
    advisors: [],
    relevance: { theme: 20, controlPlatform: 15, strategic: 14, actors: 9, followOn: 10 },
    sources: [
      {
        title: "Clearlake to Acquire Qualus",
        publisher: "Clearlake Capital",
        url: "https://clearlake.com/news/clearlake-to-acquire-qualus-a-pure-play-power-electric-grid-services-platform-from-new-mountain-capital/",
        evidence: "Clearlake agreed to acquire pure-play power and electric-grid-services platform Qualus from New Mountain Capital.",
      },
    ],
    missingFacts: ["transaction_value", "named_dealmakers", "financial_advisors", "legal_counsel", "closing_status"],
  },
  {
    id: "census-american-water-essential-2025",
    theme: "smart-water",
    tier: 1,
    name: "American Water and Essential Utilities agree to merge",
    announcementDate: "2025-10-27",
    status: "pending",
    geography: "United States",
    transactionType: "merger",
    value: { amountMillions: 63000, currency: "USD", basis: "combined_enterprise_value", disclosed: true },
    target: "Essential Utilities",
    parties: [["buyer", "American Water"]],
    people: [
      ["buyer-ceo", "John C. Griffith", "American Water"],
      ["target-ceo", "Christopher H. Franklin", "Essential Utilities"],
      ["combined-chair", "Karl Kurz", "American Water"],
    ],
    advisors: [
      ["financial-advisor-buyer", "BofA Securities"],
      ["legal-counsel-buyer", "Skadden"],
      ["financial-advisor-target", "Moelis"],
      ["legal-counsel-target", "Gibson Dunn"],
      ["communications-advisor", "Joele Frank"],
    ],
    relevance: { theme: 16, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "American Water and Essential Utilities to Merge",
        publisher: "American Water",
        url: "https://newsroom.amwater.com/2025-10-27-American-Water-and-Essential-Utilities-to-Merge-as-a-Leading-Regulated-U-S-Water-and-Wastewater-Utility",
        evidence: "The companies announced a merger with an approximately $63 billion combined enterprise value and identified principal executives and advisors.",
      },
    ],
    missingFacts: ["named_bankers", "named_lawyers", "regulatory_approval_status", "technology_integration_leads"],
  },
  {
    id: "census-xylem-evoqua-2023",
    theme: "smart-water",
    tier: 1,
    name: "Xylem acquires Evoqua",
    announcementDate: "2023-01-23",
    completionDate: "2023-05-24",
    status: "completed",
    geography: "Global",
    transactionType: "acquisition",
    value: { amountMillions: 7500, currency: "USD", basis: "all_stock_transaction_value", disclosed: true },
    target: "Evoqua",
    parties: [["buyer", "Xylem"]],
    people: [["buyer-ceo-at-transaction", "Patrick Decker", "Xylem"]],
    advisors: [],
    relevance: { theme: 20, controlPlatform: 15, strategic: 15, actors: 10, followOn: 10 },
    sources: [
      {
        title: "Xylem Completes Acquisition of Evoqua",
        publisher: "Xylem",
        url: "https://www.xylem.com/en-us/about-xylem/newsroom/press-releases/xylem-completes-acquisition-of-evoqua/",
        evidence: "Xylem completed its approximately $7.5 billion all-stock acquisition of Evoqua.",
      },
    ],
    missingFacts: ["financial_advisors", "legal_counsel", "named_evoqua_leadership", "integration_leadership"],
  },
  {
    id: "census-eversource-aquarion-2025",
    theme: "smart-water",
    tier: 1,
    name: "Eversource agrees to sell Aquarion Water Company",
    announcementDate: "2025-01-27",
    status: "pending",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 2400, currency: "USD", basis: "enterprise_value", disclosed: true },
    target: "Aquarion Water Company",
    parties: [
      ["buyer", "South Central Connecticut Regional Water Authority"],
      ["seller", "Eversource Energy"],
    ],
    people: [["seller-executive", "John Moreira", "Eversource Energy"]],
    advisors: [],
    relevance: { theme: 17, controlPlatform: 15, strategic: 14, actors: 8, followOn: 8 },
    sources: [
      {
        title: "Eversource Statement on Proposed Final Decision to Approve Aquarion Sale",
        publisher: "Eversource Energy",
        url: "https://investors.eversource.com/news-releases/news-release-details/eversource-statement-proposed-final-decision-approve-aquarion",
        evidence: "Eversource reported progress toward approval of the proposed Aquarion sale.",
      },
      {
        title: "Eversource 2025 filing on Aquarion sale",
        publisher: "Eversource Energy",
        url: "https://investors.eversource.com/static-files/458b82f8-1db9-4a46-bc90-4fe86e1ad433",
        evidence: "Eversource disclosed an aggregate enterprise value of approximately $2.4 billion.",
      },
    ],
    missingFacts: ["current_closing_status", "financial_advisors", "legal_counsel", "named_buyer_team"],
  },
  {
    id: "census-xylem-idrica-2024",
    theme: "smart-water",
    tier: 2,
    name: "Xylem acquires majority stake in Idrica",
    announcementDate: "2024-12-10",
    completionDate: "2024-12-10",
    status: "completed",
    geography: "Global / Spain",
    transactionType: "majority-investment",
    value: { amountMillions: 637, currency: "USD", basis: "fair_value_consideration", disclosed: true },
    target: "Idrica",
    parties: [["investor", "Xylem"]],
    people: [
      ["buyer-ceo", "Matthew Pine", "Xylem"],
      ["target-ceo", "Jaime Barba", "Idrica"],
    ],
    advisors: [],
    relevance: { theme: 20, controlPlatform: 14, strategic: 15, actors: 9, followOn: 10 },
    sources: [
      {
        title: "Xylem Acquires Majority Stake in Idrica",
        publisher: "Xylem",
        url: "https://www.xylem.com/en-us/about-xylem/newsroom/press-releases/xylem-acquires-majority-stake-in-idrica-to-empower-water-utilities-with-intelligent-solutions/",
        evidence: "Xylem acquired a majority stake in Idrica and identified Matthew Pine and Jaime Barba as principal executives.",
      },
      {
        title: "Xylem 2025 Annual Report",
        publisher: "Xylem",
        url: "https://prod.xylem.com/siteassets/investors/2025-annual-report-on-form-10-k.pdf",
        evidence: "Xylem reported total fair value of purchase consideration of $637 million for Idrica.",
      },
    ],
    missingFacts: ["seller_shareholders", "financial_advisors", "legal_counsel", "post_transaction_ownership_percentage"],
  },
  {
    id: "census-h2o-america-quadvest-2025",
    theme: "smart-water",
    tier: 2,
    name: "H2O America agrees to acquire Quadvest",
    announcementDate: "2025-07-08",
    status: "pending",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 540, currency: "USD", basis: "combined_transaction_value", disclosed: true },
    target: "Quadvest",
    parties: [["buyer", "H2O America"]],
    people: [
      ["buyer-legal-counsel", "Leif King", "Baker McKenzie"],
      ["buyer-legal-counsel", "Justin Bryant", "Baker McKenzie"],
      ["buyer-legal-counsel", "Nick Woo", "Baker McKenzie"],
    ],
    advisors: [
      ["business-advisor-buyer", "Newport"],
      ["business-advisor-seller", "WaterLogic Advisors"],
      ["legal-counsel-buyer", "Baker McKenzie"],
    ],
    relevance: { theme: 17, controlPlatform: 14, strategic: 13, actors: 8, followOn: 9 },
    sources: [
      {
        title: "H2O America Significantly Expands Texas Footprint with Quadvest Acquisition",
        publisher: "H2O America",
        url: "https://www.h2o-america.com/news-releases/news-release-details/h2o-america-significantly-expands-texas-footprint-texas",
        evidence: "H2O America announced agreements to acquire Quadvest assets for a combined transaction value of $540 million.",
      },
      {
        title: "Baker McKenzie Advises H2O America in Acquisition of Quadvest",
        publisher: "Baker McKenzie",
        url: "https://www.bakermckenzie.com/en/newsroom/2025/07/h2o-america-usd-540-million-acquisition-of-quadvest",
        evidence: "Baker McKenzie identified named members of the legal team advising H2O America.",
      },
    ],
    missingFacts: ["seller_legal_counsel", "named_business_advisors", "current_regulatory_status", "post_close_management"],
  },
  {
    id: "census-badger-smartcover-2025",
    theme: "smart-water",
    tier: 2,
    name: "Badger Meter acquires SmartCover Systems",
    announcementDate: "2025-01-31",
    completionDate: "2025-01-30",
    status: "completed",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 185, currency: "USD", basis: "purchase_price", disclosed: true },
    target: "SmartCover Systems",
    parties: [
      ["buyer", "Badger Meter"],
      ["seller", "XPV Water Partners"],
    ],
    people: [
      ["buyer-ceo", "Kenneth C. Bockhorst", "Badger Meter"],
      ["target-founder", "Corey Williams", "SmartCover Systems"],
      ["seller-dealmaker", "Sam Saintonge", "XPV Water Partners"],
    ],
    advisors: [["financial-advisor-seller", "Houlihan Lokey"]],
    relevance: { theme: 20, controlPlatform: 14, strategic: 14, actors: 8, followOn: 10 },
    sources: [
      {
        title: "Badger Meter Extends BlueEdge with Acquisition of SmartCover",
        publisher: "Badger Meter",
        url: "https://investors.badgermeter.com/news-releases/press-release-details/2025/Badger-Meter-Extends-BlueEdge-Suite-of-Solutions-with-Acquisition-of-SmartCover/default.aspx",
        evidence: "Badger Meter acquired SmartCover from XPV Water Partners for $185 million.",
      },
      {
        title: "Houlihan Lokey Advises SmartCover Systems",
        publisher: "Houlihan Lokey",
        url: "https://hl.com/about-us/transactions/smartcover-xpv-water-partners-badger-meter/",
        evidence: "Houlihan Lokey identified itself as sell-side advisor to SmartCover.",
      },
    ],
    missingFacts: ["named_houlihan_bankers", "buyer_advisors", "legal_counsel", "founder_post_close_role"],
  },
  {
    id: "census-ao-smith-leonard-valve-2026",
    theme: "smart-water",
    tier: 2,
    name: "A. O. Smith acquires Leonard Valve",
    announcementDate: "2026-01-06",
    completionDate: "2026-01-06",
    status: "completed",
    geography: "United States",
    transactionType: "acquisition",
    value: { amountMillions: 470, currency: "USD", basis: "purchase_price", disclosed: true },
    target: "Leonard Valve",
    parties: [["buyer", "A. O. Smith"]],
    people: [["buyer-ceo", "Steve Shafer", "A. O. Smith"]],
    advisors: [],
    relevance: { theme: 16, controlPlatform: 14, strategic: 12, actors: 8, followOn: 8 },
    sources: [
      {
        title: "A. O. Smith Completes Acquisition of Leonard Valve Company",
        publisher: "A. O. Smith",
        url: "https://investor.aosmith.com/news-releases/news-release-details/o-smith-completes-acquisition-leonard-valve-company",
        evidence: "A. O. Smith completed the $470 million acquisition of Leonard Valve to expand its water-management and digital capabilities.",
      },
    ],
    missingFacts: ["seller_identity", "target_management", "financial_advisors", "legal_counsel"],
  },
];

function valuePoints(value) {
  const amount = value.amountMillions;
  if (amount === null) return 6;
  if (amount >= 20000) return 30;
  if (amount >= 5000) return 27;
  if (amount >= 2000) return 23;
  if (amount >= 1000) return 20;
  if (amount >= 500) return 16;
  if (amount >= 100) return 12;
  return 8;
}

function monthsSince(date) {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${generatedAt}T00:00:00Z`);
  return Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
}

function recencyPoints(date) {
  const months = monthsSince(date);
  if (months <= 6) return 40;
  if (months <= 12) return 32;
  if (months <= 24) return 22;
  if (months <= 36) return 10;
  return 0;
}

function currentActivityScore(investment) {
  const recency = recencyPoints(investment.completionDate ?? investment.announcementDate);
  const status = investment.status === "pending" ? 15 : monthsSince(investment.completionDate ?? investment.announcementDate) <= 12 ? 10 : 4;
  const followOn = investment.relevance.followOn * 2;
  const actorMomentum = investment.relevance.actors * 1.5;
  const freshSignals = investment.sources.length > 1 ? 10 : 7;
  return Math.min(100, Math.round(recency + status + followOn + actorMomentum + freshSignals));
}

function materialityScore(investment) {
  const r = investment.relevance;
  return Math.min(100, valuePoints(investment.value) + r.theme + r.controlPlatform + r.strategic + r.actors + r.followOn);
}

function entity(name, kind) {
  const lookup = kind === "person" ? expertByName : companyByName;
  return {
    name,
    canonical_id: lookup.get(name.toLowerCase()) ?? null,
    canonical_match_status: lookup.has(name.toLowerCase()) ? "exact_name_match" : "unresolved",
  };
}

function normalize(investment) {
  const materiality = materialityScore(investment);
  const activity = currentActivityScore(investment);
  const missingInformationValue = Math.min(100, investment.missingFacts.length * 16);
  const researchPriority = Math.round(materiality * 0.45 + activity * 0.4 + missingInformationValue * 0.15);
  const target = entity(investment.target, "company");
  const parties = investment.parties.map(([role, name]) => ({ role, ...entity(name, "company") }));
  const people = investment.people.map(([role, name, organization]) => ({
    role,
    ...entity(name, "person"),
    organization,
    organization_canonical_id: companyByName.get(organization.toLowerCase()) ?? null,
  }));
  const advisors = investment.advisors.map(([role, name]) => ({ role, ...entity(name, "company") }));

  return {
    ...investment,
    target,
    parties,
    people,
    advisors,
    scores: {
      structural_materiality: materiality,
      current_activity: activity,
      missing_information_value: missingInformationValue,
      research_priority: researchPriority,
    },
    review: {
      status: "needs_review",
      reviewer: null,
      notes: "Initial deal-led public-source census candidate. Verify before promotion to canonical deals.",
    },
    followUpSearches: [
      ...investment.missingFacts.map((fact) => `"${investment.target}" ${fact.replaceAll("_", " ")}`),
      `"${investment.target}" acquisition named team`,
      `"${investment.target}" transaction advisors`,
    ],
  };
}

const candidates = investments.map(normalize).sort((a, b) => b.scores.research_priority - a.scores.research_priority);
const byTheme = Object.fromEntries(
  ["clean-energy-advisory", "grid-infrastructure", "smart-water"].map((theme) => {
    const themeCandidates = candidates.filter((candidate) => candidate.theme === theme);
    return [
      theme,
      {
        candidates: themeCandidates.length,
        tier_1: themeCandidates.filter((candidate) => candidate.tier === 1).length,
        tier_2: themeCandidates.filter((candidate) => candidate.tier === 2).length,
        disclosed_value_candidates: themeCandidates.filter((candidate) => candidate.value.disclosed).length,
        unresolved_people: themeCandidates.flatMap((candidate) => candidate.people).filter((person) => !person.canonical_id).length,
        unresolved_organizations: themeCandidates
          .flatMap((candidate) => [candidate.target, ...candidate.parties, ...candidate.advisors])
          .filter((organization) => !organization.canonical_id).length,
      },
    ];
  }),
);

const output = {
  schema_version: "investment-census-candidates.v1",
  generated_at: generatedAt,
  generated_by: "scripts/build-investment-census.mjs",
  review_policy: "This file contains public-source research candidates. It must not write directly to canonical deals, experts, companies or graph relationships.",
  scope: {
    objective: "Begin a deal-led census of major and recent investments across the three TowerBrook themes.",
    recent_window_start: "2024-06-04",
    methodology: "Tier 1 landmark investments plus material recent investments, prioritized by structural materiality, current activity and missing-information value.",
  },
  score_method: {
    research_priority: "45% structural materiality + 40% current activity + 15% missing-information value",
    structural_materiality: "Value band + theme relevance + control/platform significance + strategic significance + actor importance + follow-on impact",
    current_activity: "Recency + pending/recent status + follow-on impact + actor momentum + fresh source signals",
  },
  coverage: {
    total_candidates: candidates.length,
    tier_1: candidates.filter((candidate) => candidate.tier === 1).length,
    tier_2: candidates.filter((candidate) => candidate.tier === 2).length,
    by_theme: byTheme,
  },
  candidates,
};

writeFileSync(join(root, "data/investment-census-candidates.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${candidates.length} investment census candidate(s) to data/investment-census-candidates.json`);
