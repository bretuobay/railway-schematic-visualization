import {
  operationalMetrics,
  runtimeBadges,
} from './_shared/story-fixtures.js';
import {
  getLocaleSample,
  getThemeSamples,
  renderSchematicFrame,
} from './_shared/story-renderers.js';
import {
  badge,
  metricCard,
  pageShell,
  panel,
  toolbar,
} from './_shared/story-shell.js';

function renderCategoryGrid() {
  const categories = [
    ['Core', 'Graph building, SVG rendering, and export previews.'],
    ['Adapters', 'React, Vue, and Web Component integration parity.'],
    ['Ecosystem', 'Theme, i18n, SSR, canvas, and security operations.'],
    ['Exports', 'Reusable SVG, PNG, and print workflows.'],
    ['Workflows', 'Publish-ready operations dashboards for docs screenshots.'],
  ];

  return `
    <div class="story-grid story-grid--three">
      ${categories.map(([title, detail]) => panel({
        body: `<p>${detail}</p>`,
        title,
      })).join('')}
    </div>
  `;
}

export default {
  title: 'Introduction/Overview',
  parameters: {
    docs: {
      description: {
        component: 'Scenario-driven visual overview for documentation, screenshots, and product walkthroughs.',
      },
    },
  },
};

export const StorybookOverview = () => {
  const themeSample = getThemeSamples()[0];
  const localeSample = getLocaleSample('en-US');

  return pageShell({
    eyebrow: 'Documentation Companion',
    summary:
      'Use these stories as stable, screenshot-ready scenarios that mirror the docs site and show the library in realistic operating states.',
    title: 'Storybook Overview',
    body: `
      ${renderSchematicFrame({
        highlightNodeIds: ['harbor'],
        overlayIds: ['incident'],
        themeName: themeSample.label,
      })}
      <div class="story-grid story-grid--three">
        ${operationalMetrics.map((metric) => metricCard(metric)).join('')}
      </div>
      ${renderCategoryGrid()}
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Primary Use',
        title: 'Built For Docs Screenshots',
        body: `
          <p>Each major story uses deterministic fixtures, stable labels, and balanced layout so the same frame can move from Storybook to the published docs site.</p>
          <div class="story-chip-row">
            ${runtimeBadges.map((value) => badge(value, 'success')).join('')}
          </div>
        `,
      })}
      ${panel({
        eyebrow: 'Current Locale',
        title: localeSample.locale,
        body: `
          <p><strong>${localeSample.fitToView}</strong></p>
          <p>${localeSample.minimap}</p>
          <div class="story-chip-row">
            ${badge(localeSample.exportReady, 'neutral')}
          </div>
        `,
      })}
    `,
  });
};

export const DocsHeroShowcase = () => {
  const darkTheme = getThemeSamples().find((sample) => sample.label === 'dark') ?? getThemeSamples()[0];
  const rtlLocale = getLocaleSample('ar-SA');

  return pageShell({
    className: 'story-page-shell--hero',
    dataStoryId: 'docs-home-hero',
    eyebrow: 'Publish-Ready Visual',
    summary:
      'A polished operations board composition that combines rendering, export controls, theme state, locale state, and production runtime readiness.',
    title: 'Docs Hero Showcase',
    body: `
      ${toolbar([
        { label: 'Export SVG', hint: 'Vector + overlays' },
        { label: 'Export PNG', hint: 'Retina @2x' },
        { label: 'Print Preview', hint: 'A4 landscape', tone: 'secondary' },
      ])}
      ${renderSchematicFrame({
        highlightNodeIds: ['harbor', 'midtown'],
        overlayIds: ['incident', 'maintenance', 'restriction'],
        themeName: darkTheme.label,
      })}
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Theme',
        tone: 'dark',
        title: darkTheme.label,
        body: `
          <p>${darkTheme.description}</p>
          <div class="story-chip-row">
            ${darkTheme.cssSample.map(([label, value]) => badge(`${label}: ${value}`, 'dark')).join('')}
          </div>
        `,
      })}
      ${panel({
        eyebrow: 'Locale',
        title: rtlLocale.locale,
        body: `
          <div dir="${rtlLocale.directions.uiDirection}">
            <p><strong>${rtlLocale.fitToView}</strong></p>
            <p>${rtlLocale.minimap}</p>
          </div>
          <div class="story-chip-row">
            ${badge(`UI: ${rtlLocale.directions.uiDirection.toUpperCase()}`, 'neutral')}
            ${badge(`Track: ${rtlLocale.directions.schematicDirection.toUpperCase()}`, 'neutral')}
          </div>
        `,
      })}
      ${panel({
        eyebrow: 'Runtime',
        title: 'Operational Readiness',
        tone: 'success',
        body: `
          <div class="story-grid">
            ${operationalMetrics.map((metric) => metricCard(metric)).join('')}
          </div>
        `,
      })}
    `,
  });
};
