import { expect, test } from "@playwright/test";

test("the sign-in screen renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Eat together. Settle once." })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByText("New here? Sign in with Google.")).toBeVisible();
});

test("a join link asks for sign-in", async ({ page }) => {
  await page.goto("/join/share-token-1234567890");
  await expect(
    page.getByRole("heading", { name: "Someone shared an expense." })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(
    page.getByText("You will go straight back to the shared expense after signing in.")
  ).toBeVisible();
});

test("the Android platform override applies", async ({ page }) => {
  await page.goto("/?platform=android");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "android");
});
