/**
 * End-to-end product workflow — basket + Copilot + memo.
 */
import { test, expect } from "@playwright/test";
import { clearBasketState, expectBasketCount, openBasketTray } from "./helpers/basket";
import { requireLiveBackend } from "./helpers/backend-guard";
import { waitForCopilotEnrichment } from "./helpers/copilot";

test.describe("Product workflow @workflow", () => {
  test.beforeEach(() => {
    requireLiveBackend();
  });

  test("@workflow experts and companies through basket to Copilot and memo", { timeout: 180_000 }, async ({ page }) => {
    await clearBasketState(page);
    await page.goto("/experts");

    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expectBasketCount(page, "2");

    await page.goto("/companies");
    await page.locator("table").getByRole("button", { name: "Plan" }).first().click();
    await expectBasketCount(page, "3");

    await openBasketTray(page);
    await page.getByTestId("basket-call-plan").click();
    await expect(page).toHaveURL(/\/ask/);
    await waitForCopilotEnrichment(page);

    const saveButton = page.getByRole("button", { name: "Save" }).first();
    await saveButton.click();
    await expect(saveButton).toHaveText(/Saved/);

    await page.goto("/reports");
    await expect(page.getByText("Insert from basket")).toBeVisible();
    await expect(page.getByRole("link", { name: "Draft section in Copilot" })).toBeVisible();
  });
});
