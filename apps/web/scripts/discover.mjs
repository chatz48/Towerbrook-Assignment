#!/usr/bin/env node
/**
 * Live discovery / data-generation script.
 *
 * This is the engine that produced (and can extend) data/experts.json. Given a
 * theme, it uses the backend search tool for sources, asks DeepSeek to turn
 * those sources into candidates, and prints them as JSON in our Expert schema.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=replace-with-your-key BACKEND_API_URL=https://... node scripts/discover.mjs clean-energy-advisory
 *   DEEPSEEK_API_KEY=replace-with-your-key BACKEND_API_URL=https://... node scripts/discover.mjs smart-water > /tmp/new.json
 *
 * Themes: clean-energy-advisory | grid-infrastructure | smart-water
 *
 * Note: this prints candidates for human review rather than writing to data/
 * directly — sourcing decisions for a PE audience should stay human-in-the-loop.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const THEMES = {
  "clean-energy-advisory": {
    name: "Clean Energy Advisory & Development",
    keywords: ["renewable energy development", "clean energy advisory", "renewables M&A"],
    specialties: ["Solar development", "Offshore wind", "Battery storage (BESS)", "PPAs & offtake", "Project finance", "M&A advisory", "Energy market analytics"],
  },
  "grid-infrastructure": {
    name: "Grid Infrastructure & Connection",
    keywords: ["grid connection", "grid edge software", "energy flexibility"],
    specialties: ["Grid connection", "Flexibility & DER markets", "Grid-edge software", "Storage optimisation & trading", "EV charging infrastructure", "Network analytics"],
  },
  "smart-water": {
    name: "Smart Water Infrastructure & Analytics",
    keywords: ["smart water", "leak detection", "water analytics"],
    specialties: ["Leak detection", "Water quality monitoring", "Network & pressure analytics", "Flood & climate risk", "Wastewater & treatment", "Digital twin & utility software"],
  },
};

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = normalizeDeepSeekModel(process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash");

async function main() {
  const themeId = process.argv[2];
  const theme = THEMES[themeId];
  if (!theme) {
    console.error(`Usage: node scripts/discover.mjs <${Object.keys(THEMES).join(" | ")}>`);
    process.exit(1);
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("Set DEEPSEEK_API_KEY to run discovery.");
    process.exit(1);
  }
  if (!process.env.BACKEND_API_URL) {
    console.error("Set BACKEND_API_URL so discovery can use backend web search.");
    process.exit(1);
  }

  // Exclude experts we already have for this theme.
  const existing = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"))
    .filter((e) => e.themes.includes(themeId))
    .map((e) => e.name);

  console.error(`Searching the web for experts on "${theme.name}"...`);
  const sources = await collectSearchEvidence(theme, existing);

  const text = await complete(
    "You are a sourcing agent for a private equity firm. Find REAL, named experts on a theme from the supplied source snippets only. Never invent anyone. Capture a real source URL from the supplied snippets. Return ONLY a JSON array.",
    `Theme: ${theme.name}
Search terms: ${theme.keywords.join(", ")}
Sub-specialties to spread across: ${theme.specialties.join(", ")}
Exclude (already covered): ${existing.join(", ") || "(none)"}

Source snippets:
${sources
  .map(
    (source, index) =>
      `${index + 1}. ${source.title}\nURL: ${source.url}\nEvidence: ${source.evidence}`,
  )
  .join("\n\n")}

Find 5-6 experts, preferring people with a recent datable event. Return ONLY a JSON array of:
{ "name", "type", "headline", "company", "specialty", "whyRelevant", "recentNews", "sourceUrl", "confidence" }`,
  );

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    console.error("No JSON array found in model output. Raw:\n" + text);
    process.exit(2);
  }
  // Print clean JSON to stdout for piping / review.
  console.log(JSON.stringify(JSON.parse(text.slice(start, end + 1)), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function collectSearchEvidence(theme, existing) {
  const query = `${theme.name} ${theme.keywords.join(" OR ")} expert founder advisor banker lawyer private equity`;
  const response = await callBackendApi("/chat", {
    method: "POST",
    body: JSON.stringify({
      message: `${query}\nExclude already covered people if found: ${existing.join(", ")}`,
      tools: ["web_search"],
    }),
  });
  const citations = response?.citations ?? [];
  if (!citations.length) {
    throw new Error("Backend search returned no citations.");
  }
  return citations.slice(0, 12);
}

async function callBackendApi(path, init) {
  const baseUrl = process.env.BACKEND_API_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.BACKEND_API_TOKEN ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Backend API failed with HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

async function complete(system, user) {
  const response = await fetch(`${DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 3000,
      temperature: 0.2,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `DeepSeek request failed with HTTP ${response.status}`);
  }
  return payload.choices?.[0]?.message?.content ?? "";
}

function normalizeDeepSeekModel(model) {
  return {
    "deepseek-chat": "deepseek-v4-flash",
    "deepseek-v4": "deepseek-v4-flash",
  }[model] ?? model;
}
