import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const workspaceRoot = process.cwd();
const outputDirectory = resolve(workspaceRoot, process.argv[2] ?? '.artifacts/pages');
const docsRoot = resolve(workspaceRoot, 'docs');
const vitepressDist = resolve(docsRoot, '.vitepress', 'dist');

mkdirSync(outputDirectory, { recursive: true });

if (existsSync(vitepressDist)) {
  copyTree(vitepressDist, outputDirectory);
  writeFileSync(resolve(outputDirectory, 'site.json'), `${JSON.stringify(buildSiteManifest('vitepress', true), null, 2)}\n`, 'utf8');
  console.log(`Prepared docs artifact from VitePress output at ${outputDirectory}`);
  process.exit(0);
}

copyPublicAssets();
writeFileSync(resolve(outputDirectory, 'index.html'), buildFallbackIndexHtml(), 'utf8');
writeFileSync(resolve(outputDirectory, 'site.json'), `${JSON.stringify(buildSiteManifest('fallback', false), null, 2)}\n`, 'utf8');

console.log(`Prepared fallback docs artifact at ${outputDirectory}`);

function copyPublicAssets() {
  const publicDirectory = resolve(docsRoot, 'public');

  if (!existsSync(publicDirectory)) {
    return;
  }

  copyTree(publicDirectory, outputDirectory);
}

function buildFallbackIndexHtml() {
  const docsPages = [
    ['Home', '/'],
    ['Getting Started', '/getting-started'],
    ['Guides', '/guides/'],
    ['API Reference', '/api-reference'],
    ['Storybook', '/storybook'],
    ['Browser Compatibility', '/browser-compatibility'],
    ['Testing Guidelines', '/testing-guidelines'],
    ['Versioning Policy', '/versioning-policy'],
  ];
  const listItems = docsPages
    .map(([label, href]) => `<li><strong>${label}</strong><span>${href}</span></li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rail Schematic Viz Docs Artifact</title>
    <meta name="robots" content="noindex" />
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top right, rgba(15, 76, 129, 0.14), transparent 30%),
          linear-gradient(180deg, #f8fbff 0%, #edf4fa 100%);
        color: #132534;
      }
      main {
        max-width: 840px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      .card {
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(15, 76, 129, 0.12);
        border-radius: 20px;
        box-shadow: 0 18px 40px rgba(19, 37, 52, 0.08);
        padding: 24px;
      }
      h1 {
        margin-top: 0;
        font-size: 2rem;
      }
      ul {
        margin: 20px 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 12px;
      }
      li {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f7fbff;
      }
      code {
        font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Rail Schematic Viz Documentation Artifact</h1>
        <p>
          This fallback artifact was generated because VitePress build output was not available in CI.
          The repository still includes the full documentation source and configuration.
        </p>
        <p>
          Install <code>vitepress</code> locally or in CI to emit the full static documentation site.
        </p>
        <ul>${listItems}</ul>
      </section>
    </main>
  </body>
</html>
`;
}

function buildSiteManifest(mode, usesVitePressOutput) {
  return {
    generatedAt: new Date().toISOString(),
    mode,
    sourceDirectory: 'docs',
    usesVitePressOutput,
    pages: [
      '/',
      '/getting-started',
      '/guides/',
      '/api-reference',
      '/storybook',
      '/browser-compatibility',
      '/testing-guidelines',
      '/versioning-policy',
    ],
  };
}

function copyTree(sourceDirectory, targetDirectory) {
  mkdirSync(targetDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory)) {
    const sourcePath = resolve(sourceDirectory, entry);
    const targetPath = resolve(targetDirectory, entry);
    const sourceStats = statSync(sourcePath);

    if (sourceStats.isDirectory()) {
      copyTree(sourcePath, targetPath);
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}
