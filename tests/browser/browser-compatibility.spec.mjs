import { expect, test } from '@playwright/test';

test('renders a basic schematic shell in supported browsers', async ({ page }) => {
  await page.setContent(`
    <main>
      <svg id="rail-schematic" viewBox="0 0 160 80" role="img" aria-label="Rail schematic">
        <path d="M10 40 L150 40" stroke="#0f4c81" stroke-width="6" fill="none"></path>
        <circle cx="20" cy="40" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <circle cx="140" cy="40" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
      </svg>
    </main>
  `);

  await expect(page.locator('#rail-schematic')).toBeVisible();
  await expect(page.locator('#rail-schematic path')).toHaveCount(1);
  await expect(page.locator('#rail-schematic circle')).toHaveCount(2);
});
