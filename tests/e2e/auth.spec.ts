import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /log in/i }).click();
    // Sonner toast appears on auth error
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 8000 });
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Suspended user", () => {
  test("suspended page renders key message", async ({ page }) => {
    await page.goto("/suspended");
    await expect(page.getByText(/account suspended/i)).toBeVisible();
    await expect(page.getByText(/contact/i)).toBeVisible();
  });
});
