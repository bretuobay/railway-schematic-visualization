import { expect, test } from '@playwright/test';

function buildInteractiveShell() {
  return `
    <main>
      <div aria-live="polite" id="announcer">Ready</div>
      <svg
        id="rail-schematic"
        viewBox="0 0 220 120"
        role="application"
        aria-label="Interactive rail schematic"
        tabindex="0"
      >
        <path d="M20 60 L110 30 L200 60" stroke="#0f4c81" stroke-width="8" fill="none" stroke-linecap="round"></path>
        <circle data-node="station-a" cx="20" cy="60" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4" tabindex="-1"></circle>
        <circle data-node="junction-b" cx="110" cy="30" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4" tabindex="-1"></circle>
        <circle data-node="station-c" cx="200" cy="60" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4" tabindex="-1"></circle>
      </svg>
    </main>
    <script>
      const svg = document.getElementById('rail-schematic');
      const announcer = document.getElementById('announcer');
      const nodes = Array.from(document.querySelectorAll('[data-node]'));
      let activeIndex = 0;

      function selectNode(index, announcePrefix) {
        activeIndex = (index + nodes.length) % nodes.length;

        nodes.forEach((node, nodeIndex) => {
          const isActive = nodeIndex === activeIndex;
          node.dataset.active = isActive ? 'true' : 'false';
          node.setAttribute('fill', isActive ? '#f59e0b' : '#ffffff');
          node.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        announcer.textContent = announcePrefix + ' ' + nodes[activeIndex].dataset.node;
      }

      nodes.forEach((node, nodeIndex) => {
        node.addEventListener('click', () => selectNode(nodeIndex, 'Selected'));
      });

      svg.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          selectNode(activeIndex + 1, 'Focused');
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          selectNode(activeIndex - 1, 'Focused');
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNode(activeIndex, 'Selected');
        }
      });

      selectNode(0, 'Focused');
    </script>
  `;
}

test('renders an interactive schematic shell in supported browsers', async ({ page }) => {
  await page.setContent(buildInteractiveShell());

  await expect(page.locator('#rail-schematic')).toBeVisible();
  await expect(page.locator('#rail-schematic path')).toHaveCount(1);
  await expect(page.locator('#rail-schematic circle')).toHaveCount(3);
  await expect(page.locator('[data-node="station-a"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#announcer')).toHaveText('Focused station-a');
});

test('supports pointer selection and live announcements', async ({ page }) => {
  await page.setContent(buildInteractiveShell());

  await page.locator('[data-node="junction-b"]').click();

  await expect(page.locator('[data-node="junction-b"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-node="junction-b"]')).toHaveAttribute('fill', '#f59e0b');
  await expect(page.locator('#announcer')).toHaveText('Selected junction-b');
});

test('supports keyboard traversal and selection flow', async ({ page }) => {
  await page.setContent(buildInteractiveShell());
  await page.locator('#rail-schematic').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-node="junction-b"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#announcer')).toHaveText('Selected junction-b');
});
