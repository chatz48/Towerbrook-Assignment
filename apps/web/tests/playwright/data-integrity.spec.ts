/**
 * Data integrity and cross-page consistency tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Data consistency", () => {
  test("expert count is consistent across pages", async ({ page }) => {
    await page.goto("/");
    const homeCount = await page.locator("strong:has-text('252')").first().textContent();

    await page.goto("/experts");
    const expertsCount = await page.locator("strong:has-text('252')").first().textContent();

    // Counts should match
    expect(homeCount).toBe(expertsCount);
  });

  test("company count is consistent across pages", async ({ page }) => {
    await page.goto("/");
    // Find companies count in the scope bar
    const scopeText = await page.locator("text=Scope:").textContent();
    expect(scopeText).toContain("287");
  });

  test("theme filter reduces results", async ({ page }) => {
    await page.goto("/experts");

    // Get initial count
    const initialScope = await page.locator("text=Scope:").textContent();
    expect(initialScope).toContain("252");

    // Select a specific theme filter (using the dropdown, not the header)
    await page.selectOption('select:has(option:has-text("Clean Energy Advisory"))', {
      label: "Clean Energy Advisory & Development",
    }).catch(() => {
      // Fallback: try clicking the theme button
      return page.click('button:has-text("Clean Energy Advisory")');
    });

    await page.waitForTimeout(1000);
    const newScope = await page.locator("text=Scope:").textContent();
    // Should have fewer experts when filtered
    expect(newScope).not.toBe(initialScope);
  });
});

test.describe("Navigation", () => {
  const NAV_ITEMS = [
    { label: "Home", url: "/" },
    { label: "Call list", url: "/experts" },
    { label: "Targets", url: "/companies" },
    { label: "Memo", url: "/reports" },
  ];

  for (const { label, url } of NAV_ITEMS) {
    test(`nav "${label}" links to ${url}`, async ({ page }) => {
      await page.goto("/");
      await page.click(`a:has-text("${label}")`);
      await expect(page).toHaveURL(new RegExp(url));
    });
  }
});

test.describe("Error states", () => {
  test("no raw error strings visible on any page", async ({ page }) => {
    const errorStrings = [
      "BACKEND_API_URL",
      "INTERNAL_SERVER_ERROR",
      "Cannot read property",
      "undefined is not",
      "TypeError",
      "Unhandled",
    ];

    for (const path of ["/", "/experts", "/companies", "/campaign", "/ask", "/graph", "/discover", "/reports", "/deals"]) {
      await page.goto(path);
      const body = await page.textContent("body");
      for (const err of errorStrings) {
        expect(body, `${path} should not contain "${err}"`).not.toContain(err);
      }
    }
  });

  test("404 page shows user-friendly message", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    // Should not show a blank page
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Expert profile completeness", () => {
  const TOP_EXPERTS = [
    "james-knight",
    "nicholas-beatty",
    "piers-clark",
    "jo-jo-hubbard",
  ];

  for (const expertId of TOP_EXPERTS) {
    test(`expert /experts/${expertId} has required sections`, async ({ page }) => {
      await page.goto(`/experts/${expertId}`);

      // Core sections that every expert profile must have
      await expect(page.locator("text=Why call")).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("text=Call-ready, Verify")).toBeVisible({ timeout: 5_000 }).catch(() => {
        // Readiness badge may use different text
        return expect(page.locator("text=Call-ready")).toBeVisible();
      });

      // Must have at least a name as h1
      const h1 = await page.locator("h1").textContent();
      expect(h1?.length).toBeGreaterThan(0);
    });
  }
});
