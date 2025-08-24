import { test, expect } from '@playwright/test'

// Basic smoke tests: home renders, login page loads

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Family Tree App')).toBeVisible()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('text=Log In')).toBeVisible()
})

