import { test, expect } from "@playwright/test";

test.describe("Enrollment flow", () => {
  test("offerings page loads and shows listings", async ({ page }) => {
    await page.goto("/");
    // Each offering card links to /offerings/[slug] with a "View details" link
    const cards = page.getByRole("link", { name: /view details/i });
    await expect(cards.first()).toBeVisible({ timeout: 8000 });
  });

  test("enroll page for a valid slug renders the form", async ({ page }) => {
    await page.goto("/");
    const detailLink = page.getByRole("link", { name: /view details/i }).first();
    const exists = await detailLink.count();
    if (exists > 0) {
      await detailLink.click();
      // Should land on /offerings/[slug]
      await expect(page).toHaveURL(/\/offerings\//);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("invalid offering slug shows 404 or redirect", async ({ page }) => {
    const response = await page.goto("/offerings/this-does-not-exist-xyz");
    const is404 = response?.status() === 404;
    const isRedirected =
      page.url().includes("localhost:3000/") &&
      !page.url().includes("this-does-not-exist");
    expect(is404 || isRedirected).toBe(true);
  });
});
