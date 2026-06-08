/**
 * Smoke tests — verify every primary page loads without error.
 * These catch deployment issues, broken builds, and 500s.
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", label: "Command Centre" },
  { path: "/experts", label: "Expert Call List" },
  { path: "/companies", label: "Company Explorer" },
  { path: "/ask", label: "AI Copilot" },
  { path: "/graph", label: "Relationship Graph" },
  { path: "/discover", label: "Research Queue" },
  { path: "/reports", label: "Reports" },
  { path: "/deals", label: "Deal Intelligence" },
  { path: "/sources", label: "Source Register" },
];

test("@smoke campaign route redirects to call list", async ({ page }) => {
  await page.goto("/campaign");
  await expect(page).toHaveURL(/\/experts/);
});

test("@smoke legacy theme route redirects to scoped home", async ({ page }) => {
  await page.goto("/themes/clean-energy-advisory");
  await expect(page).toHaveURL(/\?theme=clean-energy-advisory/);
});

for (const { path, label } of PAGES) {
  test(`@smoke ${label} (${path}) loads and shows content`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    // Global app chrome (layout may nest additional <header>/<main> inside pages)
    await expect(page.locator("header.sticky")).toBeVisible();
    await expect(page.getByRole("link", { name: /EXPERT ENGINE/i })).toBeVisible();
    await expect(page.locator("main").first()).toBeVisible();

    // No raw error strings exposed to users
    const body = await page.textContent("body");
    expect(body).not.toContain("BACKEND_API_URL");
    expect(body).not.toContain("INTERNAL_SERVER_ERROR");
  });
}

test("@smoke Theme switcher changes scope", async ({ page }) => {
  await page.goto("/");
  const scopeNav = page.getByRole("navigation", { name: "Switch investment theme" });
  await expect(scopeNav).toContainText("Scope:");

  await scopeNav.getByRole("button", { name: "Clean Energy Advisory" }).click();
  await expect(scopeNav).toContainText("Clean Energy Advisory", { timeout: 15_000 });
});

test("@smoke Expert profile loads with key sections", async ({ page }) => {
  await page.goto("/experts/james-knight");

  await expect(page.locator("h1")).toContainText("James Knight");
  await expect(page.getByRole("heading", { name: /Why call James/i })).toBeVisible();
  await expect(page.getByText("Call-ready").first()).toBeVisible();

  await expect(page.getByRole("link", { name: "Prepare call" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View relationships" }).first()).toBeVisible();
  await expect(page.getByText("Call list outreach")).toBeVisible();

  await expect(page.getByRole("link", { name: "Augusta & Co" }).first()).toBeVisible();
});

test("@smoke Company profile loads with key sections", async ({ page }) => {
  await page.goto("/companies/zenobe");

  await expect(page.locator("h1")).toContainText("Zenob");
  await expect(page.getByText("PE target scorecard")).toBeVisible();
});
