"use client";

import { useMemo, useState } from "react";

export default function ReportExportControls({
  markdown,
  fileName,
}: {
  markdown: string;
  fileName: string;
}) {
  const [copied, setCopied] = useState(false);
  const safeFileName = useMemo(
    () => `${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`,
    [fileName],
  );

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = safeFileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyMarkdown}
        className="h-8 rounded border border-[#b8c7e6] bg-white px-3 text-[12px] font-semibold text-[#075bea] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-[#075bea] hover:bg-[#f7faff]"
      >
        {copied ? "Copied" : "Copy markdown"}
      </button>
      <button
        type="button"
        onClick={downloadMarkdown}
        className="h-8 rounded border border-[#b8c7e6] bg-white px-3 text-[12px] font-semibold text-[#075bea] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-[#075bea] hover:bg-[#f7faff]"
      >
        Export .md
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="h-8 rounded bg-[#075bea] px-3 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(7,91,234,0.18)] transition hover:bg-[#004dc9]"
      >
        Print / PDF
      </button>
    </div>
  );
}
