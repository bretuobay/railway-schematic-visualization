const allBrowserProjects = [
  {
    name: 'chrome',
    use: {
      browserName: 'chromium',
    },
  },
  {
    name: 'firefox',
    use: {
      browserName: 'firefox',
    },
  },
  {
    name: 'safari',
    use: {
      browserName: 'webkit',
    },
  },
  {
    name: 'edge',
    use: {
      browserName: 'chromium',
    },
  },
];

const shouldEnableWebkit = process.env.PLAYWRIGHT_ENABLE_WEBKIT === 'true' || process.platform === 'darwin';
const projects = allBrowserProjects.filter((project) => shouldEnableWebkit || project.name !== 'safari');

const config = {
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    headless: true,
    viewport: {
      width: 1280,
      height: 720,
    },
    ignoreHTTPSErrors: true,
  },
  projects,
};

export default config;
export { allBrowserProjects, shouldEnableWebkit };
