import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storybookDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(storybookDirectory, '..');

function resolveFromRoot(relativePath) {
  return path.resolve(workspaceRoot, relativePath);
}

export default {
  stories: [
    '../stories/**/*.stories.@(js|mjs)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  docs: {
    autodocs: false,
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...(config.resolve ?? {}),
        alias: {
          ...((config.resolve && config.resolve.alias) ?? {}),
          '@rail-schematic-viz/adapters-shared': resolveFromRoot('packages/adapters-shared/src/index.ts'),
          '@rail-schematic-viz/adapters-regional': resolveFromRoot('packages/adapters-regional/src/index.ts'),
          '@rail-schematic-viz/brushing-linking': resolveFromRoot('packages/brushing-linking/src/index.ts'),
          '@rail-schematic-viz/canvas': resolveFromRoot('packages/canvas/src/index.ts'),
          '@rail-schematic-viz/context-menu': resolveFromRoot('packages/context-menu/src/index.ts'),
          '@rail-schematic-viz/core': resolveFromRoot('src/index.ts'),
          '@rail-schematic-viz/i18n': resolveFromRoot('packages/i18n/src/index.ts'),
          '@rail-schematic-viz/layout': resolveFromRoot('packages/layout/src/index.ts'),
          '@rail-schematic-viz/overlays': resolveFromRoot('packages/overlays/src/index.ts'),
          '@rail-schematic-viz/plugins': resolveFromRoot('packages/plugins/src/index.ts'),
          '@rail-schematic-viz/react': resolveFromRoot('packages/react/src/index.ts'),
          '@rail-schematic-viz/security': resolveFromRoot('packages/security/src/index.ts'),
          '@rail-schematic-viz/ssr': resolveFromRoot('packages/ssr/src/index.ts'),
          '@rail-schematic-viz/themes': resolveFromRoot('packages/themes/src/index.ts'),
          '@rail-schematic-viz/vue': resolveFromRoot('packages/vue/src/index.ts'),
          '@rail-schematic-viz/web-component': resolveFromRoot('packages/web-component/src/index.ts'),
        },
      },
    };
  },
};
