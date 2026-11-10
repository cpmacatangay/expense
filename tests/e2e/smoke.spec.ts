import { expect, test } from "@playwright/test";

test("the sign-in screen renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Eat together. Settle once." })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("the Android platform override applies", async ({ page }) => {
  await page.goto("/?platform=android");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "android");
});
