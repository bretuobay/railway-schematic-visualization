import { exportArtifacts } from './_shared/story-fixtures.js';
import { minimalCoreSnippet } from './_shared/story-code-snippets.js';
import { renderSchematicFrame } from './_shared/story-renderers.js';
import {
  codeBlock,
  legend,
  pageShell,
  panel,
} from './_shared/story-shell.js';

function renderExportTiles() {
  return `
    <div class="story-grid story-grid--three">
      ${exportArtifacts.map((artifact) => panel({
        body: `
          <p>${artifact.detail}</p>
          <div class="story-chip-row">${artifact.size}</div>
        `,
        title: artifact.label,
      })).join('')}
    </div>
  `;
}

export default {
  title: 'Core/Renderer',
  parameters: {
    docs: {
      description: {
        component: 'Comprehensive renderer scenarios showing base rendering, network density, overlays, and export-facing previews.',
      },
    },
  },
};

export const MinimalSVGRender = () =>
  pageShell({
    eyebrow: 'Core Baseline',
    summary:
      'The smallest useful end-to-end path still uses the shared story fixture and the real core SVG renderer so the example stays honest.',
    title: 'Minimal SVG Render',
    body: `
      ${renderSchematicFrame({
        highlightNodeIds: ['west', 'east'],
        themeName: 'default',
      })}
      ${codeBlock({
        code: minimalCoreSnippet,
        language: 'ts',
      })}
    `,
    sidebar: panel({
      eyebrow: 'What To Notice',
      title: 'Renderer Guarantees',
      body: `
        <p>SVG stays vector-first, the linework is theme-aware, and the same graph can scale into richer layouts without changing the render contract.</p>
        ${legend([
          { color: '#2563eb', label: 'Main line', value: 'Default route' },
          { color: '#059669', label: 'Branch', value: 'Secondary corridor' },
          { color: '#b45309', label: 'Yard', value: 'Service movement' },
        ])}
      `,
    }),
  });

export const JunctionAndBranchingLayout = () =>
  pageShell({
    eyebrow: 'Network Density',
    summary:
      'A branching junction with a spur and a service yard gives the renderer enough complexity to show line separation, readable labels, and a more realistic footprint.',
    title: 'Junction And Branching Layout',
    body: renderSchematicFrame({
      highlightNodeIds: ['harbor'],
      themeName: 'default',
    }),
    sidebar: `
      ${panel({
        eyebrow: 'Layout Focus',
        title: 'Readable Branching',
        body: `
          <p>The main corridor holds the visual spine, while the branch and yard split cleanly enough to remain legible in narrow docs layouts and Storybook screenshots.</p>
        `,
      })}
      ${panel({
        eyebrow: 'Legend',
        title: 'Route Color Mapping',
        body: legend([
          { color: '#2563eb', label: 'Main Line', value: 'Passenger trunk' },
          { color: '#059669', label: 'Airport Spur', value: 'Branch service' },
          { color: '#b45309', label: 'Freight Yard', value: 'Service apron' },
        ]),
      })}
    `,
  });

export const OperationalStatesAndOverlays = () =>
  pageShell({
    eyebrow: 'Operational Context',
    summary:
      'The same network shifts from a clean schematic into a monitored operational view once alert, maintenance, and speed restriction overlays are layered on top.',
    title: 'Operational States And Overlays',
    body: renderSchematicFrame({
      highlightNodeIds: ['midtown', 'branchNorth'],
      overlayIds: ['incident', 'maintenance', 'restriction'],
      themeName: 'default',
    }),
    sidebar: `
      ${panel({
        eyebrow: 'Active Overlays',
        title: 'Operational Summary',
        tone: 'caution',
        body: `
          ${legend([
            { color: '#b91c1c', label: 'Signal fault', value: 'Midtown' },
            { color: '#b45309', label: 'Night works', value: 'Yard access' },
            { color: '#0284c7', label: '40 mph cap', value: 'Airport spur' },
          ])}
        `,
      })}
    `,
  });

export const ExportPreviewBoard = () =>
  pageShell({
    eyebrow: 'Export Surface',
    summary:
      'Export workflows should read as part of the product, not a separate tool. This board keeps the live schematic next to the three primary output pathways.',
    title: 'Export Preview Board',
    body: `
      ${renderSchematicFrame({
        highlightNodeIds: ['harbor'],
        overlayIds: ['incident'],
        themeName: 'default',
      })}
      ${renderExportTiles()}
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Primary Exports',
        title: 'One Rendering Surface, Three Outputs',
        body: `
          <p>SVG preserves full vector fidelity, PNG supports screenshot-grade delivery, and print preview gives operators a preflight page layout without leaving the same schematic context.</p>
        `,
      })}
    `,
  });
