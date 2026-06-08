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

const publicCapitalEvents = [
  {
    id: "public-uk-cfd-ar7-2026",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "UK Contracts for Difference Allocation Round 7 offshore wind awards",
    jurisdiction: "United Kingdom",
    announcementDate: "2026-01-14",
    status: "offered",
    publicCapitalType: "subsidy-contract",
    capital: {
      amountMillions: 1783.9,
      currency: "GBP",
      basis: "estimated_annual_budget_impact_2032_33",
      commitmentStatus: "contract_offers_subject_to_acceptance",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["scheme-owner", "Department for Energy Security and Net Zero"],
      ["delivery-body", "National Energy System Operator"],
      ["contract-counterparty", "Low Carbon Contracts Company"],
    ],
    recipients: [
      ["developer", "RWE Renewables UK"],
      ["developer", "SSE Renewables"],
      ["developer", "Vattenfall"],
      ["developer", "Copenhagen Infrastructure Partners"],
      ["developer", "Blue Gem Wind"],
    ],
    deliveryPartners: [],
    people: [],
    outputs: {
      projects: 12,
      capacity: "8,437.5 MW",
      notes: "The amount is the highest published estimated annual budget impact, not total project capex or a one-time grant.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 18, leverage: 18 },
    sources: [
      {
        title: "Contracts for Difference Allocation Round 7 results",
        publisher: "Department for Energy Security and Net Zero",
        url: "https://www.gov.uk/government/publications/contracts-for-difference-cfd-allocation-round-7-results/contracts-for-difference-allocation-round-7-results-accessible-webpage",
        evidence: "DESNZ published 12 offered contracts covering 8,437.5 MW and an estimated annual budget impact reaching about £1.784 billion in 2032/33.",
      },
    ],
    missingFacts: ["accepted_contracts", "project_capex", "named_development_leads", "project_advisors", "supply_chain_awards"],
  },
  {
    id: "public-eu-innovation-fund-2023-call",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "EU Innovation Fund 2023 call selections",
    jurisdiction: "European Economic Area",
    announcementDate: "2024-10-23",
    status: "selected",
    publicCapitalType: "grant-program",
    capital: {
      amountMillions: 4800,
      currency: "EUR",
      basis: "selected_grant_funding",
      commitmentStatus: "selected_subject_to_grant_agreements",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["scheme-owner", "European Commission"],
      ["implementing-agency", "European Climate, Infrastructure and Environment Executive Agency"],
      ["project-development-assistance", "European Investment Bank"],
    ],
    recipients: [],
    deliveryPartners: [],
    people: [
      ["policy-sponsor", "Maroš Šefčovič", "European Commission"],
      ["policy-sponsor", "Wopke Hoekstra", "European Commission"],
    ],
    outputs: {
      projects: 85,
      capacity: "3 GW solar PV manufacturing and 9.3 GW electrolyser manufacturing",
      notes: "The initial census records the program event; each selected project must become a child event.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 16, leverage: 16 },
    sources: [
      {
        title: "EU invests €4.8 billion of emissions trading revenues in innovative net-zero projects",
        publisher: "European Commission",
        url: "https://luxembourg.representation.ec.europa.eu/actualites-et-evenements/actualites/eu-invests-eu48-billion-emissions-trading-revenues-innovative-net-zero-projects-2024-10-23_en",
        evidence: "The Commission selected 85 projects in 18 countries for €4.8 billion of Innovation Fund grants.",
      },
    ],
    missingFacts: ["all_project_recipients", "signed_grant_agreements", "project_level_grants", "named_project_leads", "private_capital_mobilized"],
  },
  {
    id: "public-pentland-floating-wind-2025",
    theme: "clean-energy-advisory",
    tier: 1,
    name: "Public investors acquire stakes in Pentland Floating Offshore Wind Farm",
    jurisdiction: "Scotland, United Kingdom",
    announcementDate: "2025-11-19",
    status: "financial-close",
    publicCapitalType: "public-equity",
    capital: {
      amountMillions: 150,
      currency: "GBP",
      basis: "maximum_option_capacity_across_three_public_investors",
      commitmentStatus: "initial_stakes_acquired_with_options_to_invest",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["public-investor", "Great British Energy"],
      ["public-investor", "National Wealth Fund"],
      ["public-investor", "Scottish National Investment Bank"],
    ],
    recipients: [
      ["project-company", "Highland Wind Limited"],
      ["majority-owner", "Copenhagen Infrastructure Partners"],
    ],
    deliveryPartners: [["development-partner", "Copenhagen Offshore Partners"]],
    people: [
      ["developer-lead", "Nischal Agarwal", "Copenhagen Infrastructure Partners"],
      ["public-investor-lead", "Dan McGrail", "Great British Energy"],
      ["public-investor-lead", "Ian Brown", "National Wealth Fund"],
      ["public-investor-lead", "Mark Munro", "Scottish National Investment Bank"],
    ],
    outputs: {
      projects: 1,
      capacity: "92.5 MW",
      notes: "Each public investor acquired an initial minority stake and has an option to invest up to £50 million.",
    },
    relevance: { theme: 20, strategic: 19, marketShaping: 18, actors: 19, leverage: 18 },
    sources: [
      {
        title: "Major floating offshore wind project secures backing from Great British Energy, the National Wealth Fund, and the Scottish National Investment Bank",
        publisher: "Great British Energy",
        url: "https://www.gbe.gov.uk/index.php/blog/major-floating-offshore-wind-project-secures-backing-great-british-energy-national-wealth-fund",
        evidence: "Three public investors acquired initial stakes and each received an option to invest up to £50 million; the release names the project developer and investment leads.",
      },
    ],
    missingFacts: ["initial_stake_values", "ownership_percentages", "investment_advisors", "construction_contractors", "option_drawdown_status"],
  },
  {
    id: "public-gbe-supply-chain-fund-2025",
    theme: "clean-energy-advisory",
    tier: 2,
    name: "Great British Energy Supply Chain Fund: Offshore Wind and Networks",
    jurisdiction: "United Kingdom",
    announcementDate: "2025-12-11",
    status: "open",
    publicCapitalType: "capital-grant-program",
    capital: {
      amountMillions: 300,
      currency: "GBP",
      basis: "program_envelope",
      commitmentStatus: "applications_open_not_awarded",
      mobilizedCapitalMillions: 1000,
      mobilizedCapitalBasis: "stated_expected_public_and_private_investment_not_additional_private_capital",
    },
    sponsors: [["scheme-owner", "Great British Energy"]],
    recipients: [],
    deliveryPartners: [],
    people: [],
    outputs: {
      projects: null,
      capacity: "UK manufacturing for offshore wind and enabling electricity-network components",
      notes: "Applications remain open until December 2026 or until the budget is fully allocated.",
    },
    relevance: { theme: 18, strategic: 18, marketShaping: 20, actors: 12, leverage: 20 },
    sources: [
      {
        title: "Great British Energy Supply Chain Fund: Offshore Wind and Networks",
        publisher: "Great British Energy",
        url: "https://www.gbe.gov.uk/funding-opportunities/supply-chain-fund-offshore-wind-networks",
        evidence: "GBE opened a £300 million capital-grant fund expected to mobilize more than £1 billion of public and private investment.",
      },
    ],
    missingFacts: ["applicants", "awards", "named_fund_team", "investment_committee", "manufacturing_targets"],
  },
  {
    id: "public-solihull-energy-network-2025",
    theme: "clean-energy-advisory",
    tier: 2,
    name: "National Wealth Fund finances Solihull low-carbon energy network",
    jurisdiction: "England, United Kingdom",
    announcementDate: "2025-03-19",
    status: "financial-close",
    publicCapitalType: "public-loan",
    capital: {
      amountMillions: 9.6,
      currency: "GBP",
      basis: "public_loan",
      commitmentStatus: "financing_secured",
      mobilizedCapitalMillions: null,
    },
    sponsors: [["public-lender", "National Wealth Fund"]],
    recipients: [["borrower", "Solihull Metropolitan Borough Council"]],
    deliveryPartners: [],
    people: [],
    outputs: {
      projects: 1,
      capacity: "Town-centre low-carbon heat, hot-water, and power network",
      notes: "The first heat network financed through the National Wealth Fund's local-authority lending function.",
    },
    relevance: { theme: 18, strategic: 14, marketShaping: 16, actors: 12, leverage: 14 },
    sources: [
      {
        title: "Solihull's new low carbon Energy Network gets backing from the National Wealth Fund",
        publisher: "Solihull Metropolitan Borough Council",
        url: "https://www.solihull.gov.uk/news/solihulls-new-low-carbon-energy-network-gets-backing-national-wealth-fund",
        evidence: "Solihull Council secured a £9.6 million National Wealth Fund loan to deliver the first phase of its low-carbon energy network.",
      },
    ],
    missingFacts: ["delivery_partners", "technology_vendors", "named_project_leads", "procurement_awards", "total_project_cost"],
  },
  {
    id: "public-ofgem-riio3-electricity-2025",
    theme: "grid-infrastructure",
    tier: 1,
    name: "Ofgem RIIO-3 initial electricity-transmission investment allowance",
    jurisdiction: "Great Britain",
    announcementDate: "2025-12-04",
    status: "authorized",
    publicCapitalType: "regulated-capital-allowance",
    capital: {
      amountMillions: 10300,
      currency: "GBP",
      basis: "initial_electricity_transmission_allowance",
      commitmentStatus: "approved_subject_to_delivery_and_release_controls",
      mobilizedCapitalMillions: null,
    },
    sponsors: [["regulator", "Ofgem"]],
    recipients: [
      ["transmission-owner", "National Grid Electricity Transmission"],
      ["transmission-owner", "Scottish Hydro Electric Transmission"],
      ["transmission-owner", "SP Transmission"],
    ],
    deliveryPartners: [],
    people: [["regulator-lead", "Jonathan Brearley", "Ofgem"]],
    outputs: {
      projects: 80,
      capacity: "New and upgraded lines, substations, and associated technologies",
      notes: "£10.3 billion is the initial electricity-transmission allowance. Ofgem estimates the wider gas-and-electricity RIIO-3 program could reach £90 billion by 2031.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 20, leverage: 18 },
    sources: [
      {
        title: "Ofgem unlocks £28 billion investment to maintain a safe, secure and resilient energy grid",
        publisher: "Ofgem",
        url: "https://www.ofgem.gov.uk/press-release/ofgem-unlocks-ps28-billion-investment-maintain-safe-secure-and-resilient-energy-grid-and-upgrade-and-expand-capacity-meet-growing-demands",
        evidence: "Ofgem approved an initial £10.3 billion for electricity transmission and said it will fund 80 transmission projects over five years.",
      },
    ],
    missingFacts: ["project_level_allowances", "delivery_contractors", "technology_vendors", "named_program_leads", "advisor_teams"],
  },
  {
    id: "public-doe-grip-round2-2024",
    theme: "grid-infrastructure",
    tier: 1,
    name: "US DOE GRIP second-round selections",
    jurisdiction: "United States",
    announcementDate: "2024-10-18",
    status: "selected",
    publicCapitalType: "grant-and-cooperative-agreement-program",
    capital: {
      amountMillions: 4200,
      currency: "USD",
      basis: "selected_federal_investment",
      commitmentStatus: "selected_for_award_negotiations",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["scheme-owner", "U.S. Department of Energy"],
      ["program-office", "Office of Electricity"],
    ],
    recipients: [
      ["selectee", "Tennessee Valley Authority"],
      ["selectee", "Georgia Power Company"],
      ["selectee", "Georgia Transmission Corporation"],
      ["selectee", "Switched Source"],
    ],
    deliveryPartners: [],
    people: [],
    outputs: {
      projects: 46,
      capacity: "Projects across 47 states and the District of Columbia",
      notes: "The first two GRIP rounds total $7.6 billion across 105 selected projects.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 19, leverage: 18 },
    sources: [
      {
        title: "Grid Resilience and Innovation Partnerships Program Projects",
        publisher: "U.S. Department of Energy",
        url: "https://www.energy.gov/oe/grid-resilience-and-innovation-partnerships-grip-program-projects",
        evidence: "DOE announced about $4.2 billion for 46 second-round projects and $7.6 billion across the first two GRIP rounds.",
      },
    ],
    missingFacts: ["finalized_awards", "all_selectees", "project_level_costs", "named_delivery_leads", "vendors_and_advisors"],
  },
  {
    id: "public-doe-grip-hurricane-package-2024",
    theme: "grid-infrastructure",
    tier: 2,
    name: "US DOE GRIP hurricane-region resilience package",
    jurisdiction: "Southeastern United States",
    announcementDate: "2024-10-13",
    status: "selected",
    publicCapitalType: "grant-and-cooperative-agreement-program",
    capital: {
      amountMillions: 600,
      currency: "USD",
      basis: "selected_federal_investment",
      commitmentStatus: "selected_for_award_negotiations",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["scheme-owner", "U.S. Department of Energy"],
      ["program-office", "Office of Electricity"],
    ],
    recipients: [
      ["selectee", "Tennessee Valley Authority"],
      ["selectee", "Georgia Power Company"],
      ["selectee", "Georgia Transmission Corporation"],
      ["selectee", "Switched Source"],
      ["selectee", "Gainesville Regional Utilities"],
      ["selectee", "Randolph Electric Membership Corporation"],
    ],
    deliveryPartners: [],
    people: [],
    outputs: {
      projects: 6,
      capacity: "Advanced conductors, controls, self-healing devices, and transmission upgrades",
      notes: "The package focuses on communities affected by Hurricanes Helene and Milton.",
    },
    relevance: { theme: 20, strategic: 18, marketShaping: 17, actors: 18, leverage: 16 },
    sources: [
      {
        title: "Grid Resilience and Innovation Partnerships Program Projects",
        publisher: "U.S. Department of Energy",
        url: "https://www.energy.gov/oe/grid-resilience-and-innovation-partnerships-grip-program-projects",
        evidence: "DOE listed more than $600 million of resilience selections and identified six major recipients.",
      },
    ],
    missingFacts: ["finalized_awards", "named_project_leads", "technology_vendors", "delivery_partners", "project_schedules"],
  },
  {
    id: "public-doe-holy-cross-warn-2024",
    theme: "grid-infrastructure",
    tier: 2,
    name: "Holy Cross Energy WARN wildfire-resilience award",
    jurisdiction: "United States",
    announcementDate: "2024-10-04",
    status: "in-delivery",
    publicCapitalType: "grant",
    capital: {
      amountMillions: 99.33,
      currency: "USD",
      basis: "finalized_federal_award",
      commitmentStatus: "federal_dollars_awarded_and_project_in_delivery",
      mobilizedCapitalMillions: 45.76,
      mobilizedCapitalBasis: "calculated_total_project_cost_less_federal_award",
    },
    sponsors: [
      ["scheme-owner", "U.S. Department of Energy"],
      ["program-office", "Grid Deployment Office"],
    ],
    recipients: [["awardee", "Holy Cross Energy"]],
    deliveryPartners: [
      ["research-partner", "NRECA Research"],
      ["consortium", "39 rural electric cooperatives"],
    ],
    people: [],
    outputs: {
      projects: 1,
      capacity: "Wildfire Assessment and Resilience for Networks analysis and hardening program",
      notes: "The finalized federal award is $99.33 million against a total project cost of $145.09 million.",
    },
    relevance: { theme: 19, strategic: 16, marketShaping: 18, actors: 15, leverage: 15 },
    sources: [
      {
        title: "Preventing Outages and Enhancing the Resilience of the Electric Grid: Report to Congress",
        publisher: "U.S. Department of Energy",
        url: "https://www.energy.gov/sites/default/files/2024-08/EXEC-2023-003585%20-%20Congressional%20Report%20on%20Preventing%20Outages%20and%20Enhancing%20the%20Resilience%20of%20the%20Electric%20Grid_sb-S1_7.1.pdf",
        evidence: "DOE reported $99.33 million of federal dollars awarded against a $145.09 million total project budget for Holy Cross and its 39-cooperative consortium.",
      },
      {
        title: "Wildfire Assessment and Resilience for Networks",
        publisher: "U.S. Department of Energy",
        url: "https://www.energy.gov/nepa/articles/cx-035301-wildfire-assessment-and-resilience-networks-warn",
        evidence: "A January 2026 DOE environmental-compliance record shows WARN implementation activity continuing under the project.",
      },
    ],
    missingFacts: ["named_project_leads", "technology_vendors", "cooperative_members", "procurement_awards", "implementation_milestones"],
  },
  {
    id: "public-eu-cef-grid-2024-call",
    theme: "grid-infrastructure",
    tier: 1,
    name: "EU Connecting Europe Facility 2024 energy-infrastructure selections",
    jurisdiction: "European Union and connected markets",
    announcementDate: "2025-01-29",
    status: "selected",
    publicCapitalType: "grant-program",
    capital: {
      amountMillions: 750,
      currency: "EUR",
      basis: "approximate_grid_share_of_selected_grants",
      commitmentStatus: "selected_pending_formal_award_and_grant_agreements",
      mobilizedCapitalMillions: null,
    },
    sponsors: [
      ["scheme-owner", "European Commission"],
      ["implementing-agency", "European Climate, Infrastructure and Environment Executive Agency"],
    ],
    recipients: [],
    deliveryPartners: [],
    people: [["program-lead", "Paloma Aba-Garrote", "European Climate, Infrastructure and Environment Executive Agency"]],
    outputs: {
      projects: 8,
      capacity: "Cross-border offshore and smart electricity-grid projects",
      notes: "Nearly €750 million of the €1.25 billion call was earmarked for eight electricity-grid projects.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 19, actors: 17, leverage: 18 },
    sources: [
      {
        title: "CEF Energy: €1.25 billion allocated to 41 cross-border energy infrastructure projects",
        publisher: "European Climate, Infrastructure and Environment Executive Agency",
        url: "https://cinea.ec.europa.eu/news-events/news/cef-energy-eu125-billion-allocated-41-cross-border-energy-infrastructure-projects-2025-01-29_en",
        evidence: "CINEA announced €1.25 billion for 41 projects, with nearly €750 million earmarked for eight electricity-grid projects.",
      },
    ],
    missingFacts: ["grid_project_recipients", "formal_awards", "project_level_grants", "named_project_leads", "private_capital_mobilized"],
  },
  {
    id: "public-ofwat-pr24-2024",
    theme: "smart-water",
    tier: 1,
    name: "Ofwat PR24 water-sector expenditure allowances",
    jurisdiction: "England and Wales",
    announcementDate: "2024-12-19",
    status: "authorized",
    publicCapitalType: "regulated-capital-allowance",
    capital: {
      amountMillions: 104000,
      currency: "GBP",
      basis: "total_expenditure_allowance_2025_30",
      commitmentStatus: "final_determination_subject_to_delivery_and_reconciliation",
      mobilizedCapitalMillions: null,
    },
    sponsors: [["regulator", "Ofwat"]],
    recipients: [
      ["regulated-company", "Thames Water"],
      ["regulated-company", "United Utilities"],
      ["regulated-company", "Severn Trent"],
      ["regulated-company", "Northumbrian Water"],
      ["regulated-company", "Anglian Water"],
      ["regulated-company", "South West Water"],
    ],
    deliveryPartners: [],
    people: [["regulator-lead", "David Black", "Ofwat"]],
    outputs: {
      projects: null,
      capacity: "£60 billion base expenditure and £44 billion enhancement expenditure",
      notes: "This is customer-funded regulated expenditure, not a government grant.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 20, leverage: 18 },
    sources: [
      {
        title: "Our final determinations for the 2024 price review: sector summary",
        publisher: "Ofwat",
        url: "https://www.ofwat.gov.uk/wp-content/uploads/2024/12/PR24-FD-sector-summary-revised.pdf",
        evidence: "Ofwat's final decisions support £104 billion of water-company expenditure from 2025 to 2030.",
      },
      {
        title: "PR24 final determinations: Our approach",
        publisher: "Ofwat",
        url: "https://www.ofwat.gov.uk/wp-content/uploads/2024/12/PR24-final-determinations-Our-approach.pdf",
        evidence: "Ofwat split the £104 billion allowance into £60 billion of base expenditure and £44 billion of enhancement expenditure.",
      },
    ],
    missingFacts: ["project_level_allowances", "delivery_contractors", "technology_vendors", "named_company_program_leads", "procurement_pipeline"],
  },
  {
    id: "public-ofwat-innovation-fund-2025",
    theme: "smart-water",
    tier: 1,
    name: "Ofwat Water Breakthrough Challenge 5 awards",
    jurisdiction: "England and Wales",
    announcementDate: "2025-05-20",
    status: "awarded",
    publicCapitalType: "innovation-grant-program",
    capital: {
      amountMillions: 42.7,
      currency: "GBP",
      basis: "awarded_grants",
      commitmentStatus: "awarded",
      mobilizedCapitalMillions: 6.1,
      mobilizedCapitalBasis: "calculated_total_project_funding_less_awarded_grants",
    },
    sponsors: [
      ["scheme-owner", "Ofwat"],
      ["delivery-partner", "Challenge Works"],
      ["delivery-partner", "Arup"],
      ["delivery-partner", "Isle Utilities"],
    ],
    recipients: [
      ["lead-utility", "Northumbrian Water"],
      ["lead-utility", "South Staffordshire Water"],
      ["lead-utility", "Thames Water"],
      ["lead-utility", "South West Water"],
      ["lead-utility", "Anglian Water"],
      ["lead-utility", "Yorkshire Water"],
    ],
    deliveryPartners: [
      ["technology-partner", "Skyports Drone Services"],
      ["technology-partner", "Proteus Instrument"],
      ["technology-partner", "Makutu"],
      ["technology-partner", "Quub"],
      ["technology-partner", "UnifAI Technology"],
      ["technology-partner", "Noventa Energy"],
    ],
    people: [
      ["regulator-lead", "David Black", "Ofwat"],
      ["project-lead", "Richard Warneford", "Northumbrian Water"],
      ["project-lead", "Caroline Cooper", "South Staffordshire Water"],
    ],
    outputs: {
      projects: 16,
      capacity: "Drones, robotics, satellites, sensors, digital twins, and AI",
      notes: "Winners contributed at least another 10%, taking total project funding to £48.8 million.",
    },
    relevance: { theme: 20, strategic: 18, marketShaping: 20, actors: 20, leverage: 15 },
    sources: [
      {
        title: "Satellites, Robots, Drones and AI among winners of Ofwat's fifth Water Breakthrough Challenge",
        publisher: "Ofwat",
        url: "https://www.ofwat.gov.uk/satellites-robots-drones-and-ai-among-winners-of-ofwats-fifth-water-breakthrough-challenge/",
        evidence: "Ofwat named 16 projects, utility leads, specialist partners, and project leaders receiving £42.7 million.",
      },
    ],
    missingFacts: ["all_project_partners", "individual_award_amounts", "commercialization_status", "procurement_follow_ons", "project_outcomes"],
  },
  {
    id: "public-epa-wifia-program-2026",
    theme: "smart-water",
    tier: 1,
    name: "US EPA WIFIA program closed-loan portfolio",
    jurisdiction: "United States",
    announcementDate: "2026-05-19",
    status: "in-delivery",
    publicCapitalType: "public-credit-program",
    capital: {
      amountMillions: 23000,
      currency: "USD",
      basis: "cumulative_closed_credit_assistance",
      commitmentStatus: "closed_loans",
      mobilizedCapitalMillions: 28000,
      mobilizedCapitalBasis: "calculated_supported_project_value_less_wifia_financing",
    },
    sponsors: [["public-lender", "U.S. Environmental Protection Agency"]],
    recipients: [],
    deliveryPartners: [],
    people: [["program-lead", "Jess Kramer", "U.S. Environmental Protection Agency"]],
    outputs: {
      projects: 153,
      capacity: "$51 billion of water-infrastructure projects supported",
      notes: "This is a cumulative program snapshot and should be expanded into individual loan and procurement events.",
    },
    relevance: { theme: 20, strategic: 20, marketShaping: 20, actors: 18, leverage: 20 },
    sources: [
      {
        title: "Water Infrastructure Finance and Innovation Act",
        publisher: "U.S. Environmental Protection Agency",
        url: "https://www.epa.gov/wifia",
        evidence: "EPA reported 153 closed loans, $23 billion in WIFIA financing, and $51 billion of supported projects as of May 19, 2026.",
      },
    ],
    missingFacts: ["project_level_vendors", "named_borrower_leads", "procurement_awards", "smart_water_components", "advisor_teams"],
  },
  {
    id: "public-grand-prairie-wifia-2026",
    theme: "smart-water",
    tier: 1,
    name: "EPA closes Grand Prairie Water Commission WIFIA loan",
    jurisdiction: "Illinois, United States",
    announcementDate: "2026-03-27",
    status: "financial-close",
    publicCapitalType: "public-loan",
    capital: {
      amountMillions: 610,
      currency: "USD",
      basis: "closed_public_loan",
      commitmentStatus: "loan_closed",
      mobilizedCapitalMillions: null,
    },
    sponsors: [["public-lender", "U.S. Environmental Protection Agency"]],
    recipients: [["borrower", "Grand Prairie Water Commission"]],
    deliveryPartners: [],
    people: [
      ["public-lender-lead", "Jess Kramer", "U.S. Environmental Protection Agency"],
      ["borrower-lead", "CC DeBold", "Grand Prairie Water Commission"],
    ],
    outputs: {
      projects: 1,
      capacity: "62-mile regional water-transmission network and system upgrades",
      notes: "The loan is expected to save the commission nearly $300 million over its life.",
    },
    relevance: { theme: 18, strategic: 18, marketShaping: 16, actors: 16, leverage: 18 },
    sources: [
      {
        title: "EPA Announces $610 Million Loan to Provide a Reliable Source of Drinking Water to Northeastern Illinois Communities",
        publisher: "U.S. Environmental Protection Agency",
        url: "https://www.epa.gov/newsreleases/epa-announces-610-million-loan-provide-reliable-source-drinking-water-northeastern",
        evidence: "EPA closed a $610 million WIFIA loan, described the project, and named public-lender and borrower leaders.",
      },
    ],
    missingFacts: ["total_project_cost", "engineering_firms", "technology_vendors", "procurement_awards", "financial_and_legal_advisors"],
  },
];

const deliveryCertaintyByStatus = {
  announced: 4,
  open: 5,
  selected: 11,
  offered: 13,
  authorized: 15,
  awarded: 18,
  contracted: 19,
  "financial-close": 20,
  "in-delivery": 20,
  completed: 20,
  cancelled: 0,
};

function capitalPoints(capital) {
  const amount = capital.amountMillions;
  if (amount >= 20000) return 25;
  if (amount >= 5000) return 22;
  if (amount >= 1000) return 19;
  if (amount >= 500) return 16;
  if (amount >= 100) return 13;
  if (amount >= 25) return 10;
  return 7;
}

function monthsSince(date) {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${generatedAt}T00:00:00Z`);
  return Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
}

function recencyPoints(date) {
  const months = monthsSince(date);
  if (months <= 6) return 35;
  if (months <= 12) return 28;
  if (months <= 24) return 20;
  if (months <= 36) return 10;
  return 0;
}

function entity(name, kind) {
  const lookup = kind === "person" ? expertByName : companyByName;
  return {
    name,
    canonical_id: lookup.get(name.toLowerCase()) ?? null,
    canonical_match_status: lookup.has(name.toLowerCase()) ? "exact_name_match" : "unresolved",
  };
}

function normalizeOrganizationList(items) {
  return items.map(([role, name]) => ({ role, ...entity(name, "company") }));
}

function normalize(event) {
  const r = event.relevance;
  const strategicMateriality = Math.min(
    100,
    capitalPoints(event.capital) + r.theme + r.strategic + r.marketShaping + r.actors + Math.round(r.leverage / 2),
  );
  const deliveryCertainty = (deliveryCertaintyByStatus[event.status] ?? 0) * 5;
  const currentActivity = Math.min(
    100,
    recencyPoints(event.announcementDate) +
      (deliveryCertaintyByStatus[event.status] ?? 0) +
      Math.round(r.marketShaping * 0.8) +
      Math.round(r.actors * 0.6),
  );
  const missingInformationValue = Math.min(100, event.missingFacts.length * 16);
  const researchPriority = Math.round(
    strategicMateriality * 0.35 + currentActivity * 0.3 + deliveryCertainty * 0.2 + missingInformationValue * 0.15,
  );

  return {
    ...event,
    sponsors: normalizeOrganizationList(event.sponsors),
    recipients: normalizeOrganizationList(event.recipients),
    deliveryPartners: normalizeOrganizationList(event.deliveryPartners),
    people: event.people.map(([role, name, organization]) => ({
      role,
      ...entity(name, "person"),
      organization,
      organization_canonical_id: companyByName.get(organization.toLowerCase()) ?? null,
    })),
    scores: {
      strategic_materiality: strategicMateriality,
      current_activity: currentActivity,
      delivery_certainty: deliveryCertainty,
      missing_information_value: missingInformationValue,
      research_priority: researchPriority,
    },
    review: {
      status: "needs_review",
      reviewer: null,
      notes: "Initial public-capital source candidate. Verify status, amount basis, and participants before promotion to the canonical graph.",
    },
    followUpSearches: [
      ...event.missingFacts.map((fact) => `"${event.name}" ${fact.replaceAll("_", " ")}`),
      `"${event.name}" procurement award`,
      `"${event.name}" project team`,
    ],
  };
}

const candidates = publicCapitalEvents
  .map(normalize)
  .sort((a, b) => b.scores.research_priority - a.scores.research_priority);

const byTheme = Object.fromEntries(
  ["clean-energy-advisory", "grid-infrastructure", "smart-water"].map((theme) => {
    const themeCandidates = candidates.filter((candidate) => candidate.theme === theme);
    return [
      theme,
      {
        candidates: themeCandidates.length,
        tier_1: themeCandidates.filter((candidate) => candidate.tier === 1).length,
        tier_2: themeCandidates.filter((candidate) => candidate.tier === 2).length,
        statuses: Object.fromEntries(
          [...new Set(themeCandidates.map((candidate) => candidate.status))]
            .sort()
            .map((status) => [status, themeCandidates.filter((candidate) => candidate.status === status).length]),
        ),
        unresolved_people: themeCandidates.flatMap((candidate) => candidate.people).filter((person) => !person.canonical_id).length,
        unresolved_organizations: themeCandidates
          .flatMap((candidate) => [...candidate.sponsors, ...candidate.recipients, ...candidate.deliveryPartners])
          .filter((organization) => !organization.canonical_id).length,
      },
    ];
  }),
);

const output = {
  schema_version: "government-investment-census-candidates.v1",
  generated_at: generatedAt,
  generated_by: "scripts/build-government-investment-census.mjs",
  review_policy:
    "This file contains public-source research candidates. It must not write directly to canonical investments, experts, companies, or graph relationships.",
  accounting_policy: {
    rule: "Do not add or directly compare amounts with different capital bases.",
    required_dimensions: ["publicCapitalType", "capital.basis", "capital.commitmentStatus", "status", "delivery_certainty"],
    status_order:
      "announced/open < selected < offered < authorized < awarded < contracted < financial-close/in-delivery/completed",
    warning:
      "Program envelopes, regulated allowances, subsidy-contract budget impacts, grants, loans, guarantees, and equity stakes are economically different.",
  },
  scope: {
    objective:
      "Begin a public-capital census of major and recent government-backed investments that reveal companies, delivery partners, and experts across the three TowerBrook themes.",
    methodology:
      "Prioritize market-shaping programs and material project-level awards while preserving capital mechanism, amount basis, commitment status, and delivery certainty.",
  },
  score_method: {
    research_priority:
      "35% strategic materiality + 30% current activity + 20% delivery certainty + 15% missing-information value",
    strategic_materiality:
      "Public-capital band + theme relevance + strategic significance + market-shaping effect + actor importance + private-capital leverage",
    current_activity: "Recency + event status + market-shaping effect + actor importance",
    delivery_certainty: "Explicit status-weighted score kept separate from capital size",
  },
  coverage: {
    total_candidates: candidates.length,
    tier_1: candidates.filter((candidate) => candidate.tier === 1).length,
    tier_2: candidates.filter((candidate) => candidate.tier === 2).length,
    by_theme: byTheme,
  },
  candidates,
};

writeFileSync(join(root, "data/government-investment-census-candidates.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Wrote ${candidates.length} government investment census candidate(s) to data/government-investment-census-candidates.json`,
);
