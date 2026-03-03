const globalStyles = `
  body {
    margin: 0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top right, rgba(15, 76, 129, 0.12), transparent 35%),
      linear-gradient(180deg, #f8fbff 0%, #eef5fa 100%);
    color: #132534;
  }

  .story-shell {
    padding: 24px;
  }

  .story-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 76, 129, 0.14);
    border-radius: 18px;
    box-shadow: 0 18px 40px rgba(19, 37, 52, 0.08);
    padding: 20px;
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
