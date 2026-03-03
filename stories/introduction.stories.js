export default {
  title: 'Introduction/Overview',
  parameters: {
    docs: {
      description: {
        component: 'Interactive overview for the documentation companion stories.',
      },
    },
  },
};

export const StorybookOverview = () => `
  <section class="story-card">
    <h2 style="margin: 0 0 8px; font-size: 1.4rem;">Storybook Overview</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">
      This Storybook mirrors the VitePress documentation and provides quick visual coverage for rendering,
      framework adapters, and production ecosystem features.
    </p>
    <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">
      <li>Core rendering and SVG output examples</li>
      <li>Framework adapter integration surfaces</li>
      <li>Theming, i18n, SSR, canvas, and security scenarios</li>
    </ul>
  </section>
`;
