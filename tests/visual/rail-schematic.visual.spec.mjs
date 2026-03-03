import { expect, test } from '@playwright/test';

test('@visual keeps the baseline schematic rendering stable', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.setContent(`
    <section style="padding: 24px; background: linear-gradient(180deg, #f5f7fa 0%, #dbe4ee 100%);">
      <svg id="rail-schematic" viewBox="0 0 220 120" role="img" aria-label="Rail schematic baseline">
        <path d="M20 60 L110 30 L200 60" stroke="#0f4c81" stroke-width="8" fill="none" stroke-linecap="round"></path>
        <circle cx="20" cy="60" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4"></circle>
        <circle cx="110" cy="30" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4"></circle>
        <circle cx="200" cy="60" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4"></circle>
      </svg>
    </section>
  `);

  await expect(page.locator('#rail-schematic')).toHaveScreenshot('rail-schematic-baseline.png');
});
