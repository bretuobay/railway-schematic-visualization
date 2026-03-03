const versionItems = [
  { text: 'v0.1 (Current)', link: '/' },
  { text: 'v0.0 (Archive)', link: '/reference/versioning' },
];

export default {
  title: 'Rail Schematic Viz',
  description: 'Production-ready railway schematic visualization for data, layouts, overlays, and framework adapters.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0f4c81' }],
    ['meta', { property: 'og:title', content: 'Rail Schematic Viz' }],
    ['meta', { property: 'og:description', content: 'Typed, modular railway schematic visualization.' }],
    ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
    ['script', {}, "if (typeof window !== 'undefined' && 'serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); }); }"],
  ],
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Guides', link: '/guides/' },
      { text: 'API', link: '/api-reference' },
      { text: 'Storybook', link: '/storybook' },
      { text: 'Package Map', link: '/package-structure' },
      { text: 'Versions', items: versionItems },
    ],
    sidebar: {
      '/': [
        {
          text: 'Get Started',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'API Reference', link: '/api-reference' },
          ],
        },
        {
          text: 'API By Package',
          items: [
            { text: 'Core', link: '/api/core' },
            { text: 'Layout', link: '/api/layout' },
            { text: 'Overlays', link: '/api/overlays' },
            { text: 'Adapters Shared', link: '/api/adapters-shared' },
            { text: 'React', link: '/api/react' },
            { text: 'Vue', link: '/api/vue' },
            { text: 'Web Component', link: '/api/web-component' },
            { text: 'Themes', link: '/api/themes' },
            { text: 'I18n', link: '/api/i18n' },
            { text: 'Plugins', link: '/api/plugins' },
            { text: 'Context Menu', link: '/api/context-menu' },
            { text: 'Adapters Regional', link: '/api/adapters-regional' },
            { text: 'Brushing And Linking', link: '/api/brushing-linking' },
            { text: 'SSR', link: '/api/ssr' },
            { text: 'Canvas', link: '/api/canvas' },
            { text: 'Security', link: '/api/security' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Guide Index', link: '/guides/' },
            { text: 'Setup Guide', link: '/guides/setup' },
            { text: 'Framework Integration', link: '/guides/framework-integration' },
            { text: 'Production Rollout', link: '/guides/production-rollout' },
            { text: 'Migration Playbook', link: '/guides/migration-playbook' },
            { text: 'Package Structure', link: '/package-structure' },
            { text: 'Storybook', link: '/storybook' },
            { text: 'Browser Compatibility', link: '/browser-compatibility' },
            { text: 'Testing Guidelines', link: '/testing-guidelines' },
            { text: 'Versioning Policy', link: '/versioning-policy' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Migration Template', link: '/migrations/v1-migration-template' },
            { text: 'Bundle Size', link: '/bundle-size' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rail-schematic-viz/rail-schematic-viz' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 Rail Schematic Viz',
    },
  },
  sitemap: {
    hostname: 'https://rail-schematic-viz.dev',
  },
};
