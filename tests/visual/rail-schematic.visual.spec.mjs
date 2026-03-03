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

test('@visual keeps the compact dense-layout rendering stable', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 360 });
  await page.setContent(`
    <section
      style="
        padding: 20px;
        background:
          radial-gradient(circle at top right, rgba(10, 40, 70, 0.14), transparent 40%),
          linear-gradient(180deg, #fdfcf8 0%, #e9eef3 100%);
      "
    >
      <svg id="rail-schematic-compact" viewBox="0 0 240 140" role="img" aria-label="Compact dense rail schematic">
        <path d="M18 74 L70 40 L122 90 L174 52 L222 86" stroke="#0f4c81" stroke-width="7" fill="none" stroke-linecap="round"></path>
        <path d="M70 40 L70 98" stroke="#94a3b8" stroke-width="4" fill="none" stroke-dasharray="8 6"></path>
        <circle cx="18" cy="74" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <circle cx="70" cy="40" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <circle cx="122" cy="90" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <circle cx="174" cy="52" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <circle cx="222" cy="86" r="8" fill="#ffffff" stroke="#0f4c81" stroke-width="3"></circle>
        <rect x="58" y="94" width="24" height="12" rx="6" fill="#f59e0b"></rect>
      </svg>
    </section>
  `);

  await expect(page.locator('#rail-schematic-compact')).toHaveScreenshot('rail-schematic-compact.png');
});
