"use client";

import { useState } from "react";

export default function DealEnrichmentButton({
  dealId,
  label = "Run enrichment",
}: {
  dealId: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setState("running");
    setMessage("");
    try {
      const res = await fetch(`/api/deals/${dealId}/enrich`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichment failed");
      setState("done");
      setMessage("Job created. Refresh after completion to see new facts.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Enrichment failed");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="ee-button ee-button-primary min-h-8 px-3 disabled:opacity-50"
      >
        {state === "running" ? "Starting job..." : state === "done" ? "Job started" : label}
      </button>
      {message ? (
        <div className={`text-[11px] ${state === "error" ? "text-danger" : "text-success"}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
