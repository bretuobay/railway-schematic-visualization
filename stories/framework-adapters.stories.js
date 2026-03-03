import {
  adapterEvents,
  exportArtifacts,
} from './_shared/story-fixtures.js';
import {
  exportWorkflowSnippet,
  reactAdapterSnippet,
  vueAdapterSnippet,
  webComponentSnippet,
} from './_shared/story-code-snippets.js';
import {
  renderEventStream,
  renderSchematicFrame,
} from './_shared/story-renderers.js';
import {
  codeBlock,
  pageShell,
  panel,
  toolbar,
} from './_shared/story-shell.js';

function frameworkColumn(title, summary, snippet) {
  return panel({
    title,
    body: `
      <p>${summary}</p>
      ${codeBlock({
        code: snippet,
        language: 'ts',
      })}
    `,
  });
}

export default {
  title: 'Adapters/Frameworks',
  parameters: {
    docs: {
      description: {
        component: 'Scenario stories that compare adapter parity, integration surfaces, and export-driven host workflows.',
      },
    },
  },
};

export const FrameworkParityPanel = () =>
  pageShell({
    eyebrow: 'Shared Surface',
    summary:
      'React, Vue, and Web Components expose the same schematic scenario here so the visual comparison is about host ergonomics, not feature divergence.',
    title: 'Framework Parity Panel',
    body: `
      <div class="story-grid story-grid--three">
        ${frameworkColumn(
          'React',
          'Declarative component plus ref-driven actions for export and viewport control.',
          reactAdapterSnippet,
        )}
        ${frameworkColumn(
          'Vue',
          'Template component plus composable-driven control for emit-first apps.',
          vueAdapterSnippet,
        )}
        ${frameworkColumn(
          'Web Component',
          'DOM-native custom element for design systems, CMS hosts, and mixed stacks.',
          webComponentSnippet,
        )}
      </div>
      ${panel({
        eyebrow: 'Aligned Events',
        title: 'Runtime Parity',
        body: `
          <table class="story-table">
            <thead>
              <tr><th>Capability</th><th>React</th><th>Vue</th><th>Web Component</th></tr>
            </thead>
            <tbody>
              <tr><td>Selection events</td><td>onSelectionChange</td><td>@selection-change</td><td>rail-selection-change</td></tr>
              <tr><td>Imperative export</td><td>ref API</td><td>composable</td><td>element methods</td></tr>
              <tr><td>Viewport actions</td><td>supported</td><td>supported</td><td>supported</td></tr>
            </tbody>
          </table>
        `,
      })}
    `,
  });

export const WebComponentLiveEmbed = () =>
  pageShell({
    eyebrow: 'Framework-Free Host',
    summary:
      'This keeps the custom-element story visually accurate and screenshot-safe without introducing framework runtime complexity into the Storybook setup.',
    title: 'Web Component Live Embed',
    body: `
      <div class="story-host-window">
        <div class="story-host-window-bar">
          <span>rail-schematic-viz</span>
          <span>Property + attribute host</span>
        </div>
        ${renderSchematicFrame({
          highlightNodeIds: ['harbor'],
          overlayIds: ['incident'],
          themeName: 'default',
        })}
        ${toolbar([
          { label: 'Fit To View', hint: 'ViewportController' },
          { label: 'Export SVG', hint: 'ExportSystem' },
          { label: 'Toggle Overlay', hint: 'OverlayManager', tone: 'secondary' },
        ])}
      </div>
    `,
    sidebar: panel({
      eyebrow: 'Host Pattern',
      title: 'Custom Element Contract',
      body: codeBlock({
        code: webComponentSnippet,
        language: 'ts',
      }),
    }),
  });

export const AdapterExportWorkflow = () =>
  pageShell({
    eyebrow: 'Operational Host Shell',
    summary:
      'The export workflow story makes the adapter layer feel like a real operator console by keeping controls, output state, and event flow on a single screen.',
    title: 'Adapter Export Workflow',
    body: `
      ${toolbar([
        { label: 'Export SVG', hint: 'Current viewport' },
        { label: 'Export PNG', hint: 'Scale 2x' },
        { label: 'Print Preview', hint: 'Landscape', tone: 'secondary' },
      ])}
      <div class="story-grid story-grid--two">
        <div>
          ${renderSchematicFrame({
            highlightNodeIds: ['harbor', 'midtown'],
            overlayIds: ['incident', 'maintenance'],
            themeName: 'default',
          })}
          ${codeBlock({
            code: exportWorkflowSnippet,
            language: 'ts',
          })}
        </div>
        <div class="story-stack">
          ${exportArtifacts.map((artifact) => panel({
            title: artifact.label,
            body: `<p>${artifact.detail}</p><p><strong>${artifact.size}</strong></p>`,
          })).join('')}
        </div>
      </div>
    `,
    sidebar: panel({
      eyebrow: 'Event Stream',
      title: 'Adapter Event Mapping',
      body: renderEventStream(adapterEvents),
    }),
  });
