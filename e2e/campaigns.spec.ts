import { test, expect, Page } from "@playwright/test";

/**
 * Campaign management E2E tests.
 *
 * All API calls are intercepted. Authentication is simulated by intercepting
 * /api/auth/me to return a test user so the app thinks we're logged in.
 */

const TEST_USER = {
  id: "test-user-1",
  email: "test@example.com",
  displayName: "Test User",
  hidePhoto: false,
  layout: {},
};

async function seedAuth(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_USER),
    });
  });

  await page.route("**/api/settings**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.describe("Campaign list", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await page.route("**/api/campaigns", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "c1",
              name: "My Solo Campaign",
              type: "solo",
              users: ["test-user-1"],
              gmIds: ["test-user-1"],
              characters: [],
              expansionIds: [],
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("shows the campaigns list page when authenticated", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page).toHaveURL(/\/campaigns/);
  });

  test("displays existing campaigns", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page.getByText("My Solo Campaign")).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Campaign creation", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);

    await page.route("**/api/campaigns", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "c-new", name: "New Campaign", type: "solo" }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("shows a create campaign button on the campaigns page", async ({
    page,
  }) => {
    await page.goto("/campaigns");
    await expect(
      page.getByRole("button", { name: /create|new campaign/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
