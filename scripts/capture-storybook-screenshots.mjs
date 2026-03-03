import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, join, extname } from 'node:path';

const workspaceRoot = process.cwd();
const storybookOutputDir = resolve(workspaceRoot, 'storybook-static');
const screenshotsDir = resolve(
  workspaceRoot,
  'docs',
  'public',
  'images',
  'storybook',
);
const captureTargets = [
  {
    fileName: 'docs-home-hero.png',
    selector: '[data-story-screenshot="docs-home-hero"]',
    storyId: 'introduction-overview--docs-hero-showcase',
  },
  {
    fileName: 'storybook-control-room.png',
    selector: '[data-story-screenshot="storybook-control-room"]',
    storyId: 'ecosystem-production-features--theme-and-i-18-n-control-room',
  },
  {
    fileName: 'storybook-operations-dashboard.png',
    selector: '[data-story-screenshot="storybook-operations-dashboard"]',
    storyId: 'workflows-end-to-end--operations-dashboard',
  },
];
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!existsSync(storybookOutputDir)) {
  console.error(
    'Missing storybook-static/. Run "npm run storybook:build" before capturing Storybook screenshots.',
  );
  process.exit(1);
}

if (!existsSync(resolve(storybookOutputDir, 'iframe.html'))) {
  console.error('storybook-static/ is present, but iframe.html is missing.');
  process.exit(1);
}

mkdirSync(screenshotsDir, { recursive: true });

let chromium;

try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error(
    'Unable to load @playwright/test. Install project dependencies before generating Storybook screenshots.',
  );
  process.exit(1);
}

function resolveStaticFile(urlPathname) {
  const relativePath = decodeURIComponent(urlPathname === '/' ? '/index.html' : urlPathname);
  const safePath = relativePath.replace(/^\/+/u, '');
  const filePath = resolve(storybookOutputDir, safePath);

  if (!filePath.startsWith(storybookOutputDir)) {
    return null;
  }

  if (!existsSync(filePath)) {
    return null;
  }

  const stats = statSync(filePath);

  if (stats.isDirectory()) {
    const indexPath = join(filePath, 'index.html');

    return existsSync(indexPath) ? indexPath : null;
  }

  return filePath;
}

function getContentType(filePath) {
  return contentTypes[extname(filePath)] ?? 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const filePath = resolveStaticFile(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': getContentType(filePath) });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => {
      resolvePromise();
    });
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine Storybook screenshot server address.');
  }

  return {
    close: () =>
      new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
      }),
    origin: `http://127.0.0.1:${address.port}`,
  };
}

const viewport = {
  height: 900,
  width: 1440,
};

const staticServer = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport });

  for (const target of captureTargets) {
    const url = `${staticServer.origin}/iframe.html?id=${target.storyId}&viewMode=story`;
    const locator = page.locator(target.selector);

    await page.goto(url, { waitUntil: 'networkidle' });
    await locator.waitFor({ state: 'visible' });
    await locator.screenshot({
      path: resolve(screenshotsDir, target.fileName),
    });
  }
} finally {
  await browser.close();
  await staticServer.close();
}
