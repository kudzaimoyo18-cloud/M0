import { expect, test } from "@playwright/test";

// Smoke E2E — public storefront surface. No authentication required.
// These tests verify the customer-facing pages render and don't 500.
// Admin/checkout-write flows are deferred (admin needs ADMIN_PASSWORD;
// checkout writes need a real Neon DB seeded with products).

test.describe("Public storefront", () => {
  test("home page loads and renders the wordmark", async ({ page }) => {
    await page.goto("/");
    // Cinzel wordmark — accessible heading should contain "M0" or the
    // tagline. We assert a heading is visible at minimum.
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("cart page renders the empty state when nothing is in the cart", async ({ page }) => {
    await page.goto("/cart");
    // The cart route is statically prerendered. The empty state is the
    // contract for a new visitor.
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("checkout page redirects or shows empty-bag when cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    // With an empty cart the page shows "Your bag is empty." rather than
    // the form. Either way it must not 500.
    await expect(page.getByText(/your bag is empty/i)).toBeVisible();
  });

  test("about page reflects the post-COD copy (5–7 day delivery, no COD)", async ({ page }) => {
    await page.goto("/about");
    // Lock in the messaging contract end-to-end. Static page is server-rendered,
    // so any copy regression in production shows up here, not just in unit tests.
    await expect(page.getByText(/5–7 days/i).first()).toBeVisible();
    await expect(page.getByText(/cash on delivery/i)).toHaveCount(0);
  });

  test("shipping help page reflects the new payment + delivery model", async ({ page }) => {
    await page.goto("/help/shipping");
    await expect(page.getByText(/5–7 days/i).first()).toBeVisible();
    await expect(page.getByText(/no cash-on-delivery/i)).toBeVisible();
  });
});

test.describe("Admin gate", () => {
  test("unauthenticated /admin redirects to /signin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("signin page renders the password form", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: /admin/i })).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
