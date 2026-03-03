import { DEFAULT_STYLING, SVGRenderer } from '../../src/renderer/index.ts';
import {
  DARK_THEME_NAME,
  DEFAULT_THEME_NAME,
  HIGH_CONTRAST_THEME_NAME,
  ThemeManager,
} from '../../packages/themes/src/index.ts';
import { I18nManager } from '../../packages/i18n/src/index.ts';
import { SSRRenderer } from '../../packages/ssr/src/index.ts';
import { CanvasRenderer } from '../../packages/canvas/src/index.ts';
import { CSPValidator, XSSSanitizer } from '../../packages/security/src/index.ts';

import {
  createStoryGraph,
  lineDefinitions,
  overlayMarkers,
  stationNodes,
} from './story-fixtures.js';
import { badge, escapeHtml } from './story-shell.js';

const STORY_GRAPH = createStoryGraph();
const FALLBACK_CSS_TARGET = {
  setProperty() {},
};
const STORY_VIEWBOX_PADDING = {
  bottom: 112,
  left: 16,
  right: 40,
  top: 36,
};

function createThemeManager(themeName = DEFAULT_THEME_NAME) {
  return new ThemeManager({
    cssTarget: FALLBACK_CSS_TARGET,
    initialTheme: themeName,
  });
}

function appendToSvg(svgMarkup, markup, options = {}) {
  const role = options.role ?? 'img';
  const label = options.label ?? 'Rail schematic scenario';
  const width = options.width ? ` width="${options.width}"` : '';
  const height = options.height ? ` height="${options.height}"` : '';
  const prependMarkup = markup.prependMarkup ?? '';
  const appendMarkup = markup.appendMarkup ?? '';

  return svgMarkup
    .replace('<svg ', `<svg role="${escapeHtml(role)}" aria-label="${escapeHtml(label)}"${width}${height} `)
    .replace(/viewBox="([^"]+)"/u, (_match, viewBoxValue) => {
      const [minX, minY, widthValue, heightValue] = viewBoxValue
        .split(/\s+/u)
        .map((value) => Number.parseFloat(value));

      if ([minX, minY, widthValue, heightValue].some((value) => Number.isNaN(value))) {
        return `viewBox="${viewBoxValue}"`;
      }

      const expandedViewBox = [
        minX - STORY_VIEWBOX_PADDING.left,
        minY - STORY_VIEWBOX_PADDING.top,
        widthValue + STORY_VIEWBOX_PADDING.left + STORY_VIEWBOX_PADDING.right,
        heightValue + STORY_VIEWBOX_PADDING.top + STORY_VIEWBOX_PADDING.bottom,
      ].join(' ');

      return `viewBox="${expandedViewBox}"`;
    })
    .replace(/^(<svg\b[^>]*>)/u, `$1${prependMarkup}`)
    .replace('</svg>', `${appendMarkup}</svg>`);
}

function buildNodeLabels(theme) {
  return stationNodes.map((node) => `
    <g class="story-svg-label" data-node-id="${escapeHtml(node.id)}">
      <text
        x="${node.x}"
        y="${node.type === 'signal' ? node.y + 24 : node.y + 26}"
        text-anchor="middle"
        font-family="${escapeHtml(theme.typography.fontFamily)}"
        font-size="${theme.typography.fontSize.caption}"
        fill="${escapeHtml(theme.colors.ui.text)}"
      >${escapeHtml(node.label)}</text>
    </g>
  `).join('');
}

function buildLineBadges(theme) {
  return lineDefinitions.map((line, index) => `
    <g transform="translate(${32 + index * 180} 24)">
      <rect width="156" height="24" rx="12" fill="${escapeHtml(theme.colors.ui.surface)}" stroke="${escapeHtml(theme.colors.ui.border)}" />
      <circle cx="16" cy="12" r="5" fill="${escapeHtml(line.color)}" />
      <text
        x="30"
        y="16"
        font-family="${escapeHtml(theme.typography.fontFamily)}"
        font-size="${theme.typography.fontSize.caption}"
        fill="${escapeHtml(theme.colors.ui.text)}"
      >${escapeHtml(line.name)}</text>
    </g>
  `).join('');
}

function buildOverlayMarkup(theme, enabledOverlayIds) {
  return overlayMarkers
    .filter((marker) => enabledOverlayIds.includes(marker.id))
    .map((marker) => {
      const fill = marker.tone === 'danger'
        ? theme.colors.state.danger
        : marker.tone === 'warning'
          ? theme.colors.state.warning
          : theme.colors.state.hover;

      return `
        <g data-overlay-id="${escapeHtml(marker.id)}">
          <circle cx="${marker.x}" cy="${marker.y}" r="14" fill="${escapeHtml(fill)}" opacity="0.18" />
          <circle cx="${marker.x}" cy="${marker.y}" r="6" fill="${escapeHtml(fill)}" />
          <text
            x="${marker.x + 18}"
            y="${marker.y + 4}"
            font-family="${escapeHtml(theme.typography.fontFamily)}"
            font-size="${theme.typography.fontSize.caption}"
            fill="${escapeHtml(theme.colors.ui.text)}"
          >${escapeHtml(marker.label)}</text>
        </g>
      `;
    })
    .join('');
}

function buildHighlightMarkup(theme, highlightNodeIds) {
  return stationNodes
    .filter((node) => highlightNodeIds.includes(node.id))
    .map((node) => `
      <circle
        cx="${node.x}"
        cy="${node.y}"
        r="16"
        fill="none"
        stroke="${escapeHtml(theme.colors.state.selection)}"
        stroke-width="3"
        stroke-dasharray="4 4"
      />
    `)
    .join('');
}

function createDecoratedSvg({
  themeName = DEFAULT_THEME_NAME,
  overlayIds = [],
  highlightNodeIds = [],
  label = 'Rail schematic showcase',
}) {
  const themeManager = createThemeManager(themeName);
  const theme = themeManager.getCurrentTheme();
  const styling = {
    ...DEFAULT_STYLING,
    ...themeManager.getCurrentStylingConfiguration(),
  };
  const baseSvg = new SVGRenderer().render(STORY_GRAPH, styling);
  const background = `<rect x="0" y="0" width="100%" height="100%" fill="${escapeHtml(theme.colors.ui.background)}" opacity="0.94" />`;
  const extras = [
    buildLineBadges(theme),
    buildHighlightMarkup(theme, highlightNodeIds),
    buildOverlayMarkup(theme, overlayIds),
    buildNodeLabels(theme),
  ].join('');

  return appendToSvg(baseSvg, {
    appendMarkup: extras,
    prependMarkup: background,
  }, {
    label,
    width: 760,
  });
}

export function renderSchematicFrame(options = {}) {
  const themeManager = createThemeManager(options.themeName);
  const theme = themeManager.getCurrentTheme();

  return `
    <div
      class="story-schematic-frame"
      style="background:${escapeHtml(theme.colors.ui.surface)}; border-color:${escapeHtml(theme.colors.ui.border)};"
    >
      ${createDecoratedSvg(options)}
    </div>
  `;
}

export function getThemeSamples() {
  const themeNames = [
    DEFAULT_THEME_NAME,
    HIGH_CONTRAST_THEME_NAME,
    DARK_THEME_NAME,
  ];

  return themeNames.map((themeName) => {
    const manager = createThemeManager(themeName);
    const theme = manager.getCurrentTheme();
    const cssVariables = manager.getCSSVariables();

      return {
        cssSample: [
        ['track', cssVariables['--rail-colors-track-main']],
        ['surface', cssVariables['--rail-colors-ui-surface']],
        ['text', cssVariables['--rail-colors-ui-text']],
      ],
      description: theme.description,
      isDark: theme.isDark,
      label: theme.name,
      theme,
    };
  });
}

export function getLocaleSample(locale) {
  const manager = new I18nManager();

  manager.setLocale(locale);

  return {
    directions: manager.getDirections(),
    exportReady: manager.t('export.svgReady'),
    fitToView: manager.t('controls.zoom.fitToView'),
    locale,
    minimap: manager.t('controls.minimap.title'),
  };
}

export function getSSRPreview() {
  const renderer = new SSRRenderer();
  const svg = renderer.render(STORY_GRAPH, {
    className: 'storybook-ssr-preview',
    metadata: {
      origin: 'storybook',
      scenario: 'operations-dashboard',
    },
    title: 'SSR preview',
  });

  return {
    containsMetadata: svg.includes('<metadata>'),
    containsSSRFlag: svg.includes('data-ssr="true"'),
    snippet: `${svg.slice(0, 148)}...`,
  };
}

export function getCanvasSummary() {
  const snapshot = new CanvasRenderer().render(STORY_GRAPH, {
    heatmapPoints: [
      { id: 'dense-main', radius: 24, value: 0.92, x: 340, y: 170 },
      { id: 'dense-branch', radius: 18, value: 0.7, x: 500, y: 74 },
      { id: 'dense-yard', radius: 16, value: 0.64, x: 500, y: 272 },
    ],
    height: 320,
    width: 760,
  });

  return {
    commandCount: snapshot.commands.length,
    edgeCount: snapshot.edgeCount,
    heatmapCount: snapshot.heatmapCount,
    nodeCount: snapshot.nodeCount,
    viewBox: `${snapshot.viewBox.width} x ${snapshot.viewBox.height}`,
  };
}

export function getSecuritySummary() {
  const sanitizer = new XSSSanitizer();
  const csp = new CSPValidator();
  const unsafeSvg =
    '<svg onclick="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">Unsafe</a><text>Safe</text></svg>';
  const sanitizedSvg = sanitizer.sanitizeSVG(unsafeSvg);
  const cspResult = csp.validateCSP(
    "default-src 'self'; style-src 'self' 'nonce-demo'; script-src 'self'",
  );

  return {
    cspWarnings: cspResult.warnings.length,
    sanitizedSnippet: sanitizedSvg,
    strippedInlineHandler: !sanitizedSvg.includes('onclick='),
    strippedScript: !sanitizedSvg.includes('<script'),
  };
}

export function renderEventStream(events) {
  return `
    <ul class="story-event-stream">
      ${events.map((event) => `<li>${escapeHtml(event)}</li>`).join('')}
    </ul>
  `;
}

export function renderThemeVariableList(themeSample) {
  return `
    <div class="story-chip-row">
      ${themeSample.cssSample.map(([label, value]) => badge(`${label}: ${value}`, themeSample.isDark ? 'dark' : 'neutral')).join('')}
    </div>
  `;
}
