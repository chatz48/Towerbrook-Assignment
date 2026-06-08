import { test } from "@playwright/test";

export function requireLiveBackend() {
  const backendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    test.skip(true, "BACKEND_API_URL is not set — live backend tests require .env configuration");
  }
}
