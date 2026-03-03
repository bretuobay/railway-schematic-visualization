const shell = (title, description, content) => `
  <section class="story-card">
    <h2 style="margin: 0 0 8px; font-size: 1.4rem;">${title}</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">${description}</p>
    ${content}
  </section>
`;

export default {
  title: 'Ecosystem/Production Features',
  parameters: {
    docs: {
      description: {
        component: 'Examples for theming, i18n, context menus, SSR, canvas, and security-oriented surfaces.',
      },
    },
  },
};

export const ThemeAndI18n = () => shell(
  'Theme + I18n',
  'Shows how the theme and i18n packages combine into a production-ready host shell.',
  `
    <div style="display: grid; gap: 12px; grid-template-columns: 1.2fr 0.8fr;">
      <div style="padding: 16px; border-radius: 16px; background: #0c1822; color: #f4fbff;">
        <div style="font-size: 0.75rem; text-transform: uppercase; opacity: 0.72;">Locale</div>
        <div style="margin-top: 6px; font-size: 1.15rem;">ar-SA · RTL UI</div>
      </div>
      <div style="padding: 16px; border-radius: 16px; background: #ffffff;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: #476173;">Theme</div>
        <div style="margin-top: 6px; font-size: 1.15rem;">High Contrast</div>
      </div>
    </div>
  `,
);

export const SSRCanvasAndSecurity = () => shell(
  'SSR + Canvas + Security',
  'Represents the production path for headless rendering, dense canvas layers, and sanitized exports.',
  `
    <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">
      <li>Server-side SVG generation for pre-rendered views</li>
      <li>Hybrid canvas rendering for dense overlays</li>
      <li>Sanitized SVG and CSP validation before delivery</li>
    </ul>
  `,
);
