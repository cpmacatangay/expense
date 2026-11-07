import { expect, test } from '@playwright/test'

test('signs in as CP and reaches the home ledger', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /CP/ }).click()
  await expect(page.getByRole('heading', { name: 'Hi, CP' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'New outing' }).first()).toBeVisible()
})

test('adds a student and opens the outing wizard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /CP/ }).click()
  await page.getByRole('link', { name: 'Students' }).click()
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Zoe')
  await page.getByRole('button', { name: 'Add student' }).click()
  await expect(page.getByText('Zoe')).toBeVisible()

  await page.getByRole('link', { name: 'Home' }).click()
  await page.getByRole('link', { name: 'New outing' }).first().click()
  await expect(page.getByRole('heading', { name: 'New outing' })).toBeVisible()
})
