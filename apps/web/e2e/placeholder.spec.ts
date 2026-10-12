import { expect, test } from '@playwright/test';

test('AC-01.3 the home page renders a placeholder page', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('asesoramiento');
});
