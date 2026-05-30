import { test, expect } from "@playwright/test";

/**
 * Auth flow E2E tests.
 *
 * These tests do NOT require a real backend — they verify the UI renders
 * correctly and that form submissions fire the right network requests.
 * The API calls are intercepted with page.route().
 */
test.describe("Authentication", () => {
  test("unauthenticated users see the login page at /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // The login page should show a magic link input
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("unauthenticated users are redirected to /login from protected routes", async ({
    page,
  }) => {
    await page.goto("/campaigns");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("magic link form submits email to the API", async ({ page }) => {
    let capturedEmail: string | null = null;

    await page.route("**/api/auth/magic-link", async (route) => {
      const body = route.request().postDataJSON();
      capturedEmail = body?.email ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Link sent" }),
      });
    });

    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill("test@example.com");
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for the API call to be captured
    await page.waitForTimeout(500);
    expect(capturedEmail).toBe("test@example.com");
  });

  test("login page shows confirmation after submitting the magic link form", async ({
    page,
  }) => {
    await page.route("**/api/auth/magic-link", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Link sent" }),
      });
    });

    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill("test@example.com");
    await page.getByRole("button", { name: /send/i }).click();

    // Should show some kind of success feedback
    await expect(
      page.getByText(/check your email|link sent|magic link/i)
    ).toBeVisible({ timeout: 3000 });
  });
});
