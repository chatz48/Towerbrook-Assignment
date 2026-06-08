import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Monorepo: load shared credentials from repo-root .env (DeepSeek, Keiro, Supabase, backend URL).
loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
