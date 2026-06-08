import assert from "node:assert/strict";
import test from "node:test";

const SAMPLE =
  "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025. Houlihan Lokey advised SmartCover Systems on the transaction.";

function inferTarget(text) {
  const patterns = [
    /\b(?:acquires?|acquired|has acquired)\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)/i,
    /\bacquisition of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)/i,
    /\bsale of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+to\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[,.]$/, "");
  }
  return undefined;
}

test("acquisition regex identifies SmartCover Systems as target", () => {
  assert.equal(inferTarget(SAMPLE), "SmartCover Systems");
});
