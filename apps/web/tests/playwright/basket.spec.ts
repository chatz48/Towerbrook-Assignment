/**
 * Basket (research workspace) tests.
 */
import { test, expect } from "@playwright/test";
import {
  clearBasketState,
  expectBasketCount,
  makeBasketItem,
  openBasketTray,
  seedBasket,
} from "./helpers/basket";

test.describe("Basket @basket", () => {
  test.beforeEach(async ({ page }) => {
    await clearBasketState(page);
  });

  test("@basket call list toggle updates tray counter", async ({ page }) => {
    await page.goto("/experts");
    await page.locator('tbody input[type="checkbox"]').first().check();
    await expectBasketCount(page, "1");
  });

  test("@basket company save from directory", async ({ page }) => {
    await page.goto("/companies/zenobe");
    await page.getByRole("button", { name: /Save|Promote/ }).first().click();
    await expectBasketCount(page, "1");
    await openBasketTray(page);
    await expect(page.getByText("Companies to validate")).toBeVisible();
  });

  test("@basket tray remove item and clear basket", async ({ page }) => {
    await seedBasket(page, [
      makeBasketItem({
        id: "james-knight",
        kind: "call",
        name: "James Knight",
        href: "/experts/james-knight",
        status: "shortlisted",
      }),
      makeBasketItem({
        id: "zenobe",
        kind: "target",
        name: "Zenobe",
        href: "/companies/zenobe",
        status: "watchlist",
      }),
    ]);
    await page.goto("/");
    await openBasketTray(page);
    await page.getByRole("button", { name: "Remove James Knight" }).click();
    await expectBasketCount(page, "1");
    await openBasketTray(page);
    await page.getByRole("button", { name: "Clear basket" }).click();
    await expectBasketCount(page, "0");
  });

  test("@basket export CSV is enabled with items", async ({ page }) => {
    await seedBasket(page, [
      makeBasketItem({
        id: "zenobe",
        kind: "target",
        name: "Zenobe",
        href: "/companies/zenobe",
        status: "watchlist",
      }),
    ]);
    await page.goto("/");
    await openBasketTray(page);
    const exportButton = page.getByTestId("basket-export");
    await expect(exportButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("towerbrook-basket.csv");
  });

  test("@basket generate call plan links to Copilot", async ({ page }) => {
    await seedBasket(page, [
      makeBasketItem({
        id: "james-knight",
        kind: "call",
        name: "James Knight",
        href: "/experts/james-knight",
        status: "shortlisted",
      }),
    ]);
    await page.goto("/");
    await openBasketTray(page);
    await page.getByTestId("basket-call-plan").click();
    await expect(page).toHaveURL(/\/ask\?prompt=/);
  });

  test("@basket memo panel shows seeded items", async ({ page }) => {
    await seedBasket(page, [
      makeBasketItem({
        id: "james-knight",
        kind: "call",
        name: "James Knight",
        href: "/experts/james-knight",
        status: "shortlisted",
      }),
      makeBasketItem({
        id: "zenobe",
        kind: "target",
        name: "Zenobe",
        href: "/companies/zenobe",
        status: "watchlist",
      }),
    ]);
    await page.goto("/reports");
    await expect(page.getByText("Insert from basket")).toBeVisible();
    await expect(page.getByText("1 experts · 1 targets")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy basket as markdown" })).toBeVisible();
  });
});
