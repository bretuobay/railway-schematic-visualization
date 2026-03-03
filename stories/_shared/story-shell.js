export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

const PANEL_TONES = {
  caution: 'story-panel--caution',
  dark: 'story-panel--dark',
  emphasis: 'story-panel--emphasis',
  neutral: 'story-panel--neutral',
  success: 'story-panel--success',
};

const METRIC_TONES = {
  caution: 'story-metric--caution',
  neutral: 'story-metric--neutral',
  success: 'story-metric--success',
};

export function pageShell({
  eyebrow = '',
  title,
  summary,
  body,
  sidebar = '',
  dataStoryId = '',
  className = '',
}) {
  const classes = ['story-card', 'story-gallery', 'story-page-shell', className]
    .filter(Boolean)
    .join(' ');
  const layoutClass = sidebar
    ? 'story-two-column'
    : 'story-two-column story-two-column--single';
  const dataAttribute = dataStoryId
    ? ` data-story-screenshot="${escapeHtml(dataStoryId)}"`
    : '';

  return `
    <section class="${classes}"${dataAttribute}>
      <header class="story-page-header">
        ${eyebrow ? `<div class="story-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
        <h2 class="story-title">${escapeHtml(title)}</h2>
        <p class="story-summary">${escapeHtml(summary)}</p>
      </header>
      <div class="${layoutClass}">
        <div class="story-main-column">${body}</div>
        ${sidebar ? `<aside class="story-sidebar">${sidebar}</aside>` : ''}
      </div>
    </section>
  `;
}

export function panel({
  title,
  body,
  tone = 'neutral',
  eyebrow = '',
}) {
  const toneClass = PANEL_TONES[tone] ?? PANEL_TONES.neutral;

  return `
    <section class="story-panel ${toneClass}">
      ${eyebrow ? `<div class="story-panel-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
      <h3 class="story-panel-title">${escapeHtml(title)}</h3>
      <div class="story-panel-body">${body}</div>
    </section>
  `;
}

export function metricCard({
  label,
  value,
  delta = '',
  tone = 'neutral',
}) {
  const toneClass = METRIC_TONES[tone] ?? METRIC_TONES.neutral;

  return `
    <div class="story-metric ${toneClass}">
      <div class="story-metric-label">${escapeHtml(label)}</div>
      <div class="story-metric-value">${escapeHtml(value)}</div>
      ${delta ? `<div class="story-metric-delta">${escapeHtml(delta)}</div>` : ''}
    </div>
  `;
}

export function codeBlock({
  language,
  code,
}) {
  return `
    <div class="story-code">
      <div class="story-code-header">
        <span class="story-chip story-chip--dark">${escapeHtml(language)}</span>
      </div>
      <pre class="story-code-block"><code>${escapeHtml(code)}</code></pre>
    </div>
  `;
}

export function toolbar(actions) {
  return `
    <div class="story-toolbar">
      ${actions.map((action) => {
        const tone = action.tone ?? 'primary';
        const className = tone === 'secondary'
          ? 'story-toolbar-button story-toolbar-button--secondary'
          : 'story-toolbar-button';

        return `
          <button type="button" class="${className}">
            <span>${escapeHtml(action.label)}</span>
            ${action.hint ? `<small>${escapeHtml(action.hint)}</small>` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function legend(items) {
  return `
    <ul class="story-legend">
      ${items.map((item) => `
        <li class="story-legend-item">
          <span class="story-legend-swatch" style="background:${escapeHtml(item.color)};"></span>
          <span class="story-legend-label">${escapeHtml(item.label)}</span>
          ${item.value ? `<span class="story-legend-value">${escapeHtml(item.value)}</span>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

export function badge(label, tone = 'neutral') {
  const toneClass = tone === 'dark'
    ? 'story-chip--dark'
    : tone === 'success'
      ? 'story-chip--success'
      : tone === 'caution'
        ? 'story-chip--caution'
        : 'story-chip--neutral';

  return `<span class="story-chip ${toneClass}">${escapeHtml(label)}</span>`;
}
