import {
  adapterEvents,
  operationalMetrics,
  pluginSlots,
  runtimeBadges,
} from './_shared/story-fixtures.js';
import {
  renderEventStream,
  renderSchematicFrame,
} from './_shared/story-renderers.js';
import {
  badge,
  metricCard,
  pageShell,
  panel,
  toolbar,
} from './_shared/story-shell.js';

const ATLAS_LINE_COLOR = '#b017b0';
const ATLAS_LABEL_COLOR = '#2f2f39';

function renderAtlasSegment(points) {
  const pointString = points.map(([x, y]) => `${x},${y}`).join(' ');

  return `
    <polyline
      points="${pointString}"
      fill="none"
      stroke="${ATLAS_LINE_COLOR}"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  `;
}

function renderAtlasStop(x, y, kind = 'local') {
  if (kind === 'hub') {
    return `
      <circle cx="${x}" cy="${y}" r="10" fill="#ffffff" stroke="#111827" stroke-width="4" />
    `;
  }

  if (kind === 'border') {
    return `
      <circle cx="${x}" cy="${y}" r="5.5" fill="#ffffff" stroke="${ATLAS_LINE_COLOR}" stroke-width="2.5" />
    `;
  }

  return `
    <circle cx="${x}" cy="${y}" r="5" fill="${ATLAS_LINE_COLOR}" />
  `;
}

function renderAtlasLabel(text, x, y, anchor = 'start') {
  return `
    <text
      x="${x}"
      y="${y}"
      fill="${ATLAS_LABEL_COLOR}"
      font-family="IBM Plex Sans, Segoe UI, sans-serif"
      font-size="16"
      text-anchor="${anchor}"
    >${text}</text>
  `;
}

function renderIberianAtlasMap() {
  const segments = [
    [[90, 120], [165, 50]],
    [[90, 120], [245, 275], [355, 385], [430, 460]],
    [[335, 45], [335, 150], [335, 265]],
    [[335, 265], [395, 205], [470, 130]],
    [[470, 130], [450, 80]],
    [[470, 130], [525, 75], [585, 75], [645, 75]],
    [[355, 385], [550, 385], [710, 385], [805, 385]],
    [[430, 460], [515, 375], [610, 265], [805, 265]],
    [[610, 265], [665, 210]],
    [[550, 205], [610, 265]],
    [[805, 85], [805, 470], [805, 645]],
    [[670, 385], [670, 470], [805, 470]],
    [[430, 385], [430, 565]],
    [[430, 385], [500, 455], [500, 565]],
    [[430, 565], [370, 625]],
    [[430, 565], [480, 625], [480, 705]],
    [[370, 625], [610, 625], [805, 625]],
    [[370, 625], [370, 705]],
    [[430, 355], [385, 410]],
    [[430, 385], [430, 445]],
  ];
  const hubs = [
    [90, 120],
    [335, 265],
    [470, 130],
    [430, 385],
    [610, 265],
    [805, 265],
    [805, 385],
    [805, 470],
    [430, 565],
    [370, 625],
  ];
  const locals = [
    [165, 50],
    [245, 190],
    [285, 275],
    [335, 95],
    [335, 150],
    [395, 205],
    [450, 80],
    [525, 75],
    [585, 75],
    [550, 205],
    [665, 210],
    [570, 310],
    [515, 345],
    [550, 385],
    [640, 385],
    [735, 385],
    [670, 470],
    [805, 140],
    [805, 200],
    [805, 320],
    [805, 540],
    [670, 625],
    [430, 445],
    [430, 505],
    [500, 520],
  ];
  const borderStops = [
    [645, 75],
    [805, 85],
  ];
  const labels = [
    ['A Coruña', 165, 40, 'middle'],
    ['Santiago de Compostela', 74, 108, 'end'],
    ['Vigo', 74, 172, 'end'],
    ['Ourense', 225, 205, 'middle'],
    ['Zamora', 272, 288, 'middle'],
    ['Gijón', 335, 28, 'middle'],
    ['Oviedo', 315, 102, 'end'],
    ['León', 315, 157, 'end'],
    ['Palencia', 344, 280, 'start'],
    ['Valladolid', 346, 388, 'start'],
    ['Bilbao', 458, 54, 'middle'],
    ['Burgos', 430, 195, 'start'],
    ['Vitoria', 470, 145, 'start'],
    ['San Sebastián', 525, 58, 'middle'],
    ['Irún', 585, 58, 'middle'],
    ['To France', 655, 64, 'start'],
    ['Pamplona', 555, 192, 'middle'],
    ['Zaragoza', 600, 265, 'end'],
    ['Huesca', 670, 194, 'middle'],
    ['Lleida', 720, 255, 'middle'],
    ['Tarragona', 818, 267, 'start'],
    ['Barcelona', 818, 202, 'start'],
    ['Girona', 818, 142, 'start'],
    ['To France', 805, 73, 'middle'],
    ['Castelló', 818, 322, 'start'],
    ['Valencia', 818, 387, 'start'],
    ['Alicante', 818, 472, 'start'],
    ['Murcia', 818, 545, 'start'],
    ['Almería', 818, 628, 'start'],
    ['Madrid', 442, 398, 'start'],
    ['Guadalajara', 525, 343, 'start'],
    ['Calatayud', 580, 313, 'start'],
    ['Cuenca', 560, 372, 'middle'],
    ['Requena', 735, 372, 'middle'],
    ['Toledo', 382, 454, 'end'],
    ['Ciudad Real', 418, 470, 'end'],
    ['Puertollano', 418, 507, 'end'],
    ['Jaén', 505, 535, 'start'],
    ['Córdoba', 442, 567, 'start'],
    ['Sevilla', 358, 627, 'end'],
    ['Granada', 670, 613, 'middle'],
    ['Cádiz', 372, 725, 'start'],
    ['Málaga', 482, 722, 'start'],
  ];

  return `
    <div class="story-schematic-frame" style="background:#f5f5f7; border-color:rgba(176, 23, 176, 0.18);">
      <svg
        viewBox="-120 0 1100 760"
        width="100%"
        role="img"
        aria-label="Iberian intercity rail atlas inspired schematic"
      >
        <rect x="-120" y="0" width="1100" height="760" fill="#f5f5f7" rx="20" />
        ${segments.map((segment) => renderAtlasSegment(segment)).join('')}
        ${locals.map(([x, y]) => renderAtlasStop(x, y)).join('')}
        ${hubs.map(([x, y]) => renderAtlasStop(x, y, 'hub')).join('')}
        ${borderStops.map(([x, y]) => renderAtlasStop(x, y, 'border')).join('')}
        ${labels.map(([text, x, y, anchor]) => renderAtlasLabel(text, x, y, anchor)).join('')}
      </svg>
    </div>
  `;
}

export default {
  title: 'Workflows/End-to-End',
  parameters: {
    docs: {
      description: {
        component: 'Large, publication-ready operating scenarios designed for high-value documentation screenshots and full product walkthroughs.',
      },
    },
  },
};

export const OperationsDashboard = () =>
  pageShell({
    className: 'story-page-shell--hero',
    dataStoryId: 'storybook-operations-dashboard',
    eyebrow: 'End-To-End Workflow',
    summary:
      'This is the broadest operational surface in Storybook: a control-center composition that ties rendering, runtime, export, and operator actions together.',
    title: 'Operations Dashboard',
    body: `
      <div class="story-grid story-grid--three">
        ${operationalMetrics.map((metric) => metricCard(metric)).join('')}
      </div>
      ${toolbar([
        { label: 'Fit To View', hint: 'Layout action' },
        { label: 'Export PNG', hint: 'Retina screenshot' },
        { label: 'Print Preview', hint: 'Briefing handoff', tone: 'secondary' },
      ])}
      ${renderSchematicFrame({
        highlightNodeIds: ['harbor', 'midtown', 'branchNorth'],
        overlayIds: ['incident', 'maintenance', 'restriction'],
        themeName: 'dark',
      })}
      <div class="story-chip-row">
        ${runtimeBadges.map((item) => badge(item, 'success')).join('')}
      </div>
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Context',
        title: 'Plugin + Menu Surface',
        body: `
          <ul class="story-event-stream">
            ${pluginSlots.map((plugin) => `<li>${plugin.name} · ${plugin.state}</li>`).join('')}
          </ul>
        `,
      })}
      ${panel({
        eyebrow: 'Runtime Events',
        title: 'Live Event Stream',
        body: renderEventStream(adapterEvents),
      })}
    `,
  });

export const PublishReadyDocumentationState = () =>
  pageShell({
    eyebrow: 'Editorial Capture',
    summary:
      'A stable 16:9-style composition designed to drop cleanly into product documentation, release notes, and rollout guides.',
    title: 'Publish Ready Documentation State',
    body: `
      <div class="story-poster">
        <div class="story-poster-header">
          <div>
            <div class="story-eyebrow">Documentation Snapshot</div>
            <h3 class="story-panel-title">Production-Ready Rail Schematic Surface</h3>
          </div>
          <div class="story-chip-row">
            ${badge('CI validated', 'success')}
            ${badge('Versioned docs asset', 'neutral')}
          </div>
        </div>
        ${renderSchematicFrame({
          highlightNodeIds: ['harbor', 'east'],
          overlayIds: ['incident', 'restriction'],
          themeName: 'default',
        })}
        <div class="story-grid story-grid--three">
          ${['Core + Layout', 'Adapters + Export', 'Ecosystem + Runtime'].map((item) => panel({
            title: item,
            body: '<p>Ready for documentation, onboarding, and rollout pages.</p>',
          })).join('')}
        </div>
      </div>
    `,
  });

export const IberianNetworkAtlas = () =>
  pageShell({
    eyebrow: 'Atlas-Style Schematic',
    summary:
      'A more comprehensive network-style showcase inspired by classic national rail atlas diagrams, with a radial capital hub, coastal trunk, border connectors, and labeled branch geometry.',
    title: 'Iberian Network Atlas',
    body: `
      ${toolbar([
        { label: 'National overview', hint: 'Atlas composition' },
        { label: 'Dense labels', hint: 'Editorial map' },
        { label: 'Screenshot ready', hint: 'Docs candidate', tone: 'secondary' },
      ])}
      ${renderIberianAtlasMap()}
    `,
    sidebar: `
      ${panel({
        eyebrow: 'Design Intent',
        title: 'Replicate A Complex Reference Map',
        body: `
          <p>This story deliberately shifts from the compact demo graph into a denser atlas-style composition so we can test label density, long corridors, and branch readability in one frame.</p>
        `,
      })}
      ${panel({
        eyebrow: 'What It Demonstrates',
        title: 'Comprehensive Scenario',
        body: `
          <ul class="story-event-stream">
            <li>Radial hub centered on a national capital</li>
            <li>Long east-coast trunk with multiple interchange stops</li>
            <li>Cross-country branches and border handoff markers</li>
            <li>Editorial label density closer to published transit diagrams</li>
          </ul>
        `,
      })}
    `,
  });
