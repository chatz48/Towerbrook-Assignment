import { expect, type Page } from "@playwright/test";

export async function submitCopilotQuestion(page: Page, question: string) {
  const textbox = page.getByPlaceholder("Ask over experts, companies, relationships, and sources...");
  await textbox.fill(question);
  await textbox.press("Enter");
}

export async function waitForCopilotBaseline(page: Page) {
  await expect(page.getByText("Initial answer (from directory)")).toBeVisible({
    timeout: 45_000,
  });
}

export function rankedExpertsHeading(page: Page) {
  return page.getByRole("heading", { name: /Ranked experts/i });
}

export function rankedCompaniesHeading(page: Page) {
  return page.getByRole("heading", { name: /Ranked companies/i });
}

export async function waitForRankedExperts(page: Page) {
  await expect(rankedExpertsHeading(page)).toBeVisible({ timeout: 120_000 });
}

export async function waitForCopilotEnrichment(page: Page) {
  await waitForRankedExperts(page);
  await expect(
    page.getByTestId("copilot-trust-badge").filter({ hasText: /AI-assisted|Sourced from directory/ }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function ensureCopilotResponse(page: Page, fallbackQuestion: string) {
  try {
    await rankedExpertsHeading(page).waitFor({ timeout: 1_000 });
  } catch {
    await submitCopilotQuestion(page, fallbackQuestion);
    await rankedExpertsHeading(page).waitFor({ timeout: 120_000 });
  }
}
