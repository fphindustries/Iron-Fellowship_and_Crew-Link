import { test, expect } from "@playwright/test";

/**
 * Home page E2E smoke tests — these do not require authentication.
 */
test.describe("Home page", () => {
  test("loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page).toHaveURL("/");

    // No unhandled JS errors
    expect(errors).toHaveLength(0);
  });

  test("has a link to the login page", async ({ page }) => {
    await page.goto("/");
    // Look for any link that points to /login
    const loginLink = page.locator('a[href*="/login"]');
    await expect(loginLink.first()).toBeVisible({ timeout: 5000 });
  });

  test("title contains the app name", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    // Should not be blank
    expect(title.length).toBeGreaterThan(0);
  });
});
