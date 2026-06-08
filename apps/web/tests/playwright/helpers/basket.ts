import { expect, type Page } from "@playwright/test";

export const WORKSPACE_STORAGE_KEY = "towerbrook-investor-workspace-v1";
export const SKIP_BASKET_AUTO_RUN_KEY = "towerbrook-copilot-skip-basket-auto-run";

export type BasketKind = "call" | "target" | "memo";

export interface BasketFixtureItem {
  id: string;
  kind: BasketKind;
  name: string;
  sub?: string;
  href: string;
  theme?: string;
  note?: string;
  status: string;
  addedAt: string;
}

export function makeBasketItem(
  item: Omit<BasketFixtureItem, "addedAt">,
): BasketFixtureItem {
  return { ...item, addedAt: new Date().toISOString() };
}

export async function seedBasket(
  page: Page,
  items: Omit<BasketFixtureItem, "addedAt">[],
  options?: { skipAutoRun?: boolean },
) {
  const payload = items.map(makeBasketItem);
  const skipAutoRun = options?.skipAutoRun ?? false;
  await page.addInitScript(
    ({ key, data, skipKey, skip }) => {
      localStorage.setItem(key, JSON.stringify(data));
      if (skip) localStorage.setItem(skipKey, "1");
      else localStorage.removeItem(skipKey);
    },
    {
      key: WORKSPACE_STORAGE_KEY,
      data: payload,
      skipKey: SKIP_BASKET_AUTO_RUN_KEY,
      skip: skipAutoRun,
    },
  );
}

export async function seedBasketOnPage(
  page: Page,
  items: Omit<BasketFixtureItem, "addedAt">[],
  options?: { skipAutoRun?: boolean },
) {
  const payload = items.map(makeBasketItem);
  const skipAutoRun = options?.skipAutoRun ?? false;
  await page.addInitScript(
    ({ key, data, skipKey, skip }) => {
      sessionStorage.setItem("__playwright_basket_seed", JSON.stringify({ data, skipAutoRun: skip }));
      localStorage.setItem(key, JSON.stringify(data));
      if (skip) localStorage.setItem(skipKey, "1");
      else localStorage.removeItem(skipKey);
    },
    {
      key: WORKSPACE_STORAGE_KEY,
      data: payload,
      skipKey: SKIP_BASKET_AUTO_RUN_KEY,
      skip: skipAutoRun,
    },
  );
  await page.goto("/");
  await page.reload();
}

export async function clearBasketState(page: Page) {
  await page.addInitScript(
    ({ key, skipKey }) => {
      const clearFlag = "__playwright_basket_cleared";
      if (sessionStorage.getItem(clearFlag) === "1") return;
      localStorage.removeItem(key);
      localStorage.removeItem(skipKey);
      sessionStorage.setItem(clearFlag, "1");
    },
    { key: WORKSPACE_STORAGE_KEY, skipKey: SKIP_BASKET_AUTO_RUN_KEY },
  );
}

export async function openBasketTray(page: Page) {
  const tray = page.getByTestId("basket-tray");
  if (await tray.isVisible()) return;
  await page.getByTestId("basket-tray-toggle").click();
  await expect(tray).toBeVisible();
}

export async function closeBasketTray(page: Page) {
  const tray = page.getByTestId("basket-tray");
  if (!(await tray.isVisible())) return;
  await page.getByRole("button", { name: "Close investor workspace" }).click();
  await expect(tray).toBeHidden();
}

export function basketCounter(page: Page) {
  return page.getByTestId("basket-counter");
}

export async function expectBasketCount(page: Page, count: string) {
  if (await page.getByTestId("basket-tray").isVisible()) {
    await closeBasketTray(page);
  }
  await expect(basketCounter(page)).toHaveText(count);
}
