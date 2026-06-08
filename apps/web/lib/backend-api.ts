function resolveBackendApiUrl(): string | null {
  if (process.env.BACKEND_API_URL) {
    return process.env.BACKEND_API_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8001";
  }
  return null;
}

export function hasBackendApi() {
  return Boolean(resolveBackendApiUrl());
}

export async function callBackendApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const baseUrl = resolveBackendApiUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(process.env.BACKEND_API_TOKEN
        ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  const raw = await response.text();
  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      data = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      if (!response.ok) {
        throw new Error(raw.slice(0, 160) || `Backend API failed: ${response.status}`);
      }
      throw new Error("Backend returned a non-JSON response.");
    }
  }
  if (!response.ok) {
    const detail = data.error ?? data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null && "message" in detail
          ? String((detail as { message?: unknown }).message ?? response.status)
          : `Backend API failed: ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}
