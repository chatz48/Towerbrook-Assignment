"use client";

import { useEffect, useState } from "react";

export default function ThemeBriefNarrative({
  themeId,
  initialNarrative,
}: {
  themeId: string;
  initialNarrative: string;
}) {
  const [narrative, setNarrative] = useState(initialNarrative);
  const [refined, setRefined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeId }),
        });
        const data = (await res.json()) as { narrative?: string; grounded?: boolean };
        if (!cancelled && res.ok && data.grounded && data.narrative) {
          setNarrative(data.narrative);
          setRefined(true);
        }
      } catch {
        // keep deterministic narrative
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [themeId]);

  return (
    <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
      {narrative}
      {refined ? (
        <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-accent">AI refined</span>
      ) : null}
    </p>
  );
}
