const globalStyles = `
  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top right, rgba(15, 76, 129, 0.14), transparent 34%),
      radial-gradient(circle at 15% 10%, rgba(5, 150, 105, 0.08), transparent 28%),
      linear-gradient(180deg, #f8fbff 0%, #eef5fa 100%);
    color: #132534;
  }

  .story-shell {
    padding: 24px;
  }

  .story-gallery {
    max-width: 1380px;
    margin: 0 auto;
  }

  .story-card {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(15, 76, 129, 0.14);
    border-radius: 24px;
    box-shadow: 0 20px 48px rgba(19, 37, 52, 0.08);
    padding: 28px;
  }

  .story-page-shell--hero {
    padding: 32px;
    border-radius: 28px;
  }

  .story-page-header {
    margin-bottom: 22px;
  }

  .story-eyebrow,
  .story-panel-eyebrow {
    font-size: 0.74rem;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #476173;
    margin-bottom: 10px;
  }

  .story-title {
    margin: 0;
    font-size: clamp(1.55rem, 2.5vw, 2.45rem);
    line-height: 1.1;
    color: #102235;
  }

  .story-summary {
    margin: 10px 0 0;
    max-width: 880px;
    line-height: 1.6;
    color: #41586b;
  }

  .story-two-column {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
    align-items: start;
  }

  .story-two-column--single {
    grid-template-columns: 1fr;
  }

  .story-main-column,
  .story-sidebar,
  .story-stack {
    display: grid;
    gap: 16px;
  }

  .story-grid {
    display: grid;
    gap: 16px;
  }

  .story-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .story-grid--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .story-panel {
    border: 1px solid rgba(15, 76, 129, 0.1);
    border-radius: 20px;
    padding: 18px;
    background: rgba(255, 255, 255, 0.88);
  }

  .story-panel--dark {
    background: #0f1f2e;
    color: #edf7ff;
    border-color: rgba(115, 199, 255, 0.18);
  }

  .story-panel--dark .story-panel-eyebrow,
  .story-panel--dark .story-panel-title {
    color: #edf7ff;
  }

  .story-panel--success {
    background: rgba(236, 253, 245, 0.92);
    border-color: rgba(21, 128, 61, 0.2);
  }

  .story-panel--caution {
    background: rgba(255, 251, 235, 0.95);
    border-color: rgba(180, 83, 9, 0.22);
  }

  .story-panel--emphasis {
    background: linear-gradient(180deg, rgba(236, 245, 255, 0.96), rgba(248, 252, 255, 0.96));
  }

  .story-panel-title {
    margin: 0 0 10px;
    font-size: 1.05rem;
    line-height: 1.2;
    color: #102235;
  }

  .story-panel-body,
  .story-panel-body p {
    margin: 0;
    line-height: 1.55;
    color: inherit;
  }

  .story-panel-body p + p {
    margin-top: 10px;
  }

  .story-schematic-frame {
    border: 1px solid rgba(15, 76, 129, 0.1);
    border-radius: 22px;
    padding: 12px;
    overflow: hidden;
  }

  .story-schematic-frame svg {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 16px;
  }

  .story-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .story-toolbar-button {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(135deg, #0f4c81, #1f6a9c);
    color: #ffffff;
    padding: 10px 16px;
    font: inherit;
    font-weight: 600;
  }

  .story-toolbar-button--secondary {
    background: rgba(255, 255, 255, 0.96);
    color: #12304a;
    border: 1px solid rgba(15, 76, 129, 0.16);
  }

  .story-toolbar-button small {
    font-size: 0.72rem;
    opacity: 0.84;
  }

  .story-code {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(15, 76, 129, 0.12);
    background: #0f172a;
  }

  .story-code-header {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(15, 23, 42, 0.98);
  }

  .story-code-block {
    margin: 0;
    padding: 14px;
    overflow: auto;
    white-space: pre;
    font-size: 0.79rem;
    line-height: 1.6;
    color: #dbeafe;
    background: #0f172a;
  }

  .story-metric {
    border-radius: 18px;
    padding: 16px;
    border: 1px solid rgba(15, 76, 129, 0.1);
    background: rgba(255, 255, 255, 0.92);
  }

  .story-metric--success {
    background: rgba(236, 253, 245, 0.92);
  }

  .story-metric--caution {
    background: rgba(255, 251, 235, 0.92);
  }

  .story-metric-label {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #476173;
  }

  .story-metric-value {
    margin-top: 8px;
    font-size: 1.5rem;
    font-weight: 700;
    color: #102235;
  }

  .story-metric-delta {
    margin-top: 6px;
    font-size: 0.86rem;
    color: #476173;
  }

  .story-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .story-chip {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
  }

  .story-chip--neutral {
    background: rgba(15, 76, 129, 0.08);
    color: #12304a;
  }

  .story-chip--dark {
    background: rgba(19, 37, 52, 0.96);
    color: #eef8ff;
  }

  .story-chip--success {
    background: rgba(21, 128, 61, 0.12);
    color: #166534;
  }

  .story-chip--caution {
    background: rgba(180, 83, 9, 0.14);
    color: #92400e;
  }

  .story-legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .story-legend-item {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }

  .story-legend-swatch {
    width: 14px;
    height: 14px;
    border-radius: 999px;
  }

  .story-legend-label {
    font-weight: 600;
  }

  .story-legend-value {
    font-size: 0.82rem;
    color: #476173;
  }

  .story-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .story-table th,
  .story-table td {
    text-align: left;
    padding: 8px 6px;
    border-bottom: 1px solid rgba(15, 76, 129, 0.1);
    vertical-align: top;
  }

  .story-table th {
    color: #476173;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .story-event-stream {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .story-event-stream li {
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(15, 76, 129, 0.06);
    border: 1px solid rgba(15, 76, 129, 0.08);
    font-size: 0.85rem;
  }

  .story-host-window {
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(15, 76, 129, 0.14);
    background: rgba(255, 255, 255, 0.96);
  }

  .story-host-window-bar {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
    background: #102235;
    color: #eef8ff;
    font-size: 0.82rem;
  }

  .story-context-menu {
    display: grid;
    gap: 8px;
  }

  .story-context-item {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(15, 76, 129, 0.08);
    background: rgba(255, 255, 255, 0.94);
    color: #102235;
    font: inherit;
  }

  .story-context-item--active {
    border-color: rgba(37, 99, 235, 0.25);
    background: rgba(219, 234, 254, 0.92);
  }

  .story-poster {
    display: grid;
    gap: 18px;
  }

  .story-poster-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  @media (max-width: 1100px) {
    .story-two-column,
    .story-grid--three {
      grid-template-columns: 1fr;
    }

    .story-grid--two {
      grid-template-columns: 1fr;
    }
  }
`;

export default {
  parameters: {
    layout: 'fullscreen',
    controls: {
      expanded: true,
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#eef5fa' },
        { name: 'editorial', value: '#dfeaf4' },
        { name: 'contrast', value: '#0c1822' },
      ],
    },
  },
};

export const decorators = [
  (story) => `
    <style>${globalStyles}</style>
    <div class="story-shell">${story()}</div>
  `,
];
