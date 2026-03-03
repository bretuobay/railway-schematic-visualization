import {
  contextMenuActions,
  pluginSlots,
  regionalSources,
  runtimeBadges,
} from './_shared/story-fixtures.js';
import { themeI18nSnippet } from './_shared/story-code-snippets.js';
import {
  getCanvasSummary,
  getLocaleSample,
  getSecuritySummary,
  getSSRPreview,
  getThemeSamples,
  renderSchematicFrame,
  renderThemeVariableList,
} from './_shared/story-renderers.js';
import {
  badge,
  codeBlock,
  pageShell,
  panel,
} from './_shared/story-shell.js';

export default {
  title: 'Ecosystem/Production Features',
  parameters: {
    docs: {
      description: {
        component: 'Production-facing scenarios covering theme, i18n, plugins, context menus, SSR, canvas, security, and regional data inputs.',
      },
    },
  },
};

export const ThemeAndI18nControlRoom = () => {
  const themeSamples = getThemeSamples();
  const defaultLocale = getLocaleSample('en-US');
  const rtlLocale = getLocaleSample('ar-SA');

  return pageShell({
    dataStoryId: 'storybook-control-room',
    eyebrow: 'Theme + Locale',
    summary:
      'The same operational schematic stays visually consistent while the host shell adapts to different built-in themes and UI directions.',
    title: 'Theme And I18n Control Room',
    body: `
      <div class="story-grid story-grid--three">
        ${themeSamples.map((sample, index) => {
          const localeSample = index === 2 ? rtlLocale : defaultLocale;

          return panel({
            tone: sample.isDark ? 'dark' : 'neutral',
            title: sample.label,
            body: `
              <div dir="${localeSample.directions.uiDirection}">
                <p><strong>${localeSample.fitToView}</strong></p>
                <p>${localeSample.minimap}</p>
                ${renderSchematicFrame({
                  highlightNodeIds: index === 0 ? ['harbor'] : index === 1 ? ['midtown'] : ['branchNorth'],
                  overlayIds: index === 0 ? ['incident'] : index === 1 ? ['maintenance'] : ['restriction'],
                  themeName: sample.label,
                })}
                ${renderThemeVariableList(sample)}
              </div>
            `,
          });
        }).join('')}
      </div>
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Implementation',
        title: 'Shared Theme + Locale Setup',
        body: codeBlock({
          code: themeI18nSnippet,
          language: 'ts',
        }),
      })}
      ${panel({
        eyebrow: 'Readiness',
        title: 'Operational Guarantees',
        tone: 'success',
        body: `<div class="story-chip-row">${runtimeBadges.map((item) => badge(item, 'success')).join('')}</div>`,
      })}
    `,
  });
};

ThemeAndI18nControlRoom.storyName = 'Theme And I18n Control Room';

export const ContextMenuAndPluginSurface = () =>
  pageShell({
    eyebrow: 'Extensibility',
    summary:
      'Operators need the contextual menu and plugin layer to feel attached to the same selection model, not bolted on after rendering.',
    title: 'Context Menu And Plugin Surface',
    body: `
      <div class="story-grid story-grid--two">
        <div>
          ${renderSchematicFrame({
            highlightNodeIds: ['harbor'],
            overlayIds: ['incident'],
            themeName: 'default',
          })}
        </div>
        <div class="story-stack">
          ${panel({
            eyebrow: 'Selection',
            title: 'Harbor Exchange',
            body: `
              <div class="story-context-menu">
                ${contextMenuActions.map((item, index) => `
                  <button type="button" class="story-context-item${index === 2 ? ' story-context-item--active' : ''}">
                    ${item}
                  </button>
                `).join('')}
              </div>
            `,
          })}
          ${panel({
            eyebrow: 'Plugin Bus',
            title: 'Active Plugins',
            body: `
              <ul class="story-event-stream">
                ${pluginSlots.map((plugin) => `
                  <li>${plugin.name} · ${plugin.state}</li>
                `).join('')}
              </ul>
            `,
          })}
        </div>
      </div>
    `,
  });

export const SSRCanvasAndSecurity = () => {
  const ssr = getSSRPreview();
  const canvas = getCanvasSummary();
  const security = getSecuritySummary();

  return pageShell({
    eyebrow: 'Production Runtime',
    summary:
      'SSR, canvas density, and security validation should be legible in one pass because they all influence how the schematic reaches production users.',
    title: 'SSR Canvas And Security',
    body: `
      <div class="story-grid story-grid--three">
        ${panel({
          eyebrow: 'SSR',
          title: 'Headless SVG',
          body: `
            <p>${ssr.containsSSRFlag ? 'SSR flag present' : 'SSR flag missing'}</p>
            <pre class="story-code-block"><code>${ssr.snippet}</code></pre>
          `,
        })}
        ${panel({
          eyebrow: 'Canvas',
          title: 'Dense Layer Summary',
          body: `
            <p>${canvas.commandCount} commands</p>
            <p>${canvas.edgeCount} edges · ${canvas.nodeCount} nodes · ${canvas.heatmapCount} heatmap layers</p>
            <p>${canvas.viewBox}</p>
          `,
        })}
        ${panel({
          eyebrow: 'Security',
          title: 'Sanitized Export',
          tone: 'success',
          body: `
            <p>${security.strippedScript ? 'Scripts stripped' : 'Scripts retained'}</p>
            <p>${security.strippedInlineHandler ? 'Inline handlers removed' : 'Inline handlers retained'}</p>
            <pre class="story-code-block"><code>${security.sanitizedSnippet}</code></pre>
            <p>${security.cspWarnings} CSP warnings</p>
          `,
        })}
      </div>
    `,
  });
};

export const RegionalDataImportWorkbench = () =>
  pageShell({
    eyebrow: 'Regional Data',
    summary:
      'Different infrastructure data sources still need to normalize into the same rail graph that drives rendering, overlays, and export workflows.',
    title: 'Regional Data Import Workbench',
    body: `
      <div class="story-grid story-grid--two">
        <div class="story-grid story-grid--two">
          ${regionalSources.map((source) => panel({
            title: source.label,
            body: `
              <p>${source.detail}</p>
              <p><strong>${source.count}</strong></p>
            `,
          })).join('')}
        </div>
        ${renderSchematicFrame({
          highlightNodeIds: ['harbor', 'branchNorth'],
          overlayIds: ['restriction'],
          themeName: 'default',
        })}
      </div>
    `,
    sidebar: panel({
      eyebrow: 'Normalization',
      title: 'One Canonical RailGraph',
      body: `
        <p>Once regional inputs are normalized, they feed the same rendering, adapter, and export surface that the rest of the product uses.</p>
      `,
    }),
  });
