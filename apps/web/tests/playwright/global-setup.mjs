import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const candidates = [
    resolve(here, "../../../.env"),
    resolve(here, "../../.env"),
    resolve(here, "../.env"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

export default async function globalSetup() {
  loadEnvFile();

  const grep = process.env.PLAYWRIGHT_GREP ?? "";
  const needsBackend =
    /@copilot|@workflow/.test(grep) ||
    process.argv.some((arg) => /@copilot|@workflow/.test(arg));
  if (!needsBackend) return;

  const backendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    throw new Error(
      "BACKEND_API_URL is not set. Copy .env.example to .env, start `pnpm api:dev`, and set BACKEND_API_URL.",
    );
  }

  const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Backend health returned HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body?.ok) {
    throw new Error("Backend health payload missing ok:true");
  }
}
