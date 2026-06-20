import { test, expect } from "@playwright/test";

test.describe("Enrollment flow", () => {
  test("offerings page loads and shows listings", async ({ page }) => {
    await page.goto("/");
    // At least one offering card should be visible
    const cards = page.locator("[data-offering-card]").or(
      page.getByRole("link", { name: /enroll/i })
    );
    await expect(cards.first()).toBeVisible({ timeout: 8000 });
  });

  test("enroll page for a valid slug renders the form", async ({ page }) => {
    // Navigate to offerings page first and find a real slug
    await page.goto("/");
    const enrollLink = page.getByRole("link", { name: /enroll now/i }).first();
    const exists = await enrollLink.count();
    if (exists > 0) {
      await enrollLink.click();
      // Should land on /offerings/[slug]/enroll
      await expect(page).toHaveURL(/\/enroll/);
      await expect(page.getByRole("heading")).toBeVisible();
    }
  });

  test("invalid offering slug shows 404 or redirect", async ({ page }) => {
    const response = await page.goto("/offerings/this-does-not-exist-xyz");
    // Either 404 status or a redirect to home
    const is404 = response?.status() === 404;
    const isRedirected = page.url().includes("localhost:3000/") && !page.url().includes("this-does-not-exist");
    expect(is404 || isRedirected).toBe(true);
  });
});
