const shell = (title, description, body) => `
  <section class="story-card">
    <h2 style="margin: 0 0 8px; font-size: 1.4rem;">${title}</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">${description}</p>
    ${body}
  </section>
`;

export default {
  title: 'Adapters/Frameworks',
  parameters: {
    docs: {
      description: {
        component: 'Framework-facing integration examples for React, Vue, and Web Components.',
      },
    },
  },
};

export const SharedAdapterControls = () => shell(
  'Shared Adapter Controls',
  'Highlights the aligned capabilities exposed by React, Vue, and Web Component adapters.',
  `
    <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      <div style="padding: 16px; border-radius: 14px; background: #ffffff;">
        <strong>React</strong>
        <p style="margin: 8px 0 0;">Component + hook with imperative ref actions.</p>
      </div>
      <div style="padding: 16px; border-radius: 14px; background: #ffffff;">
        <strong>Vue</strong>
        <p style="margin: 8px 0 0;">Component + composable with emit-driven events.</p>
      </div>
      <div style="padding: 16px; border-radius: 14px; background: #ffffff;">
        <strong>Web Component</strong>
        <p style="margin: 8px 0 0;">Property + attribute contract with DOM events.</p>
      </div>
    </div>
  `,
);

export const ExportActionsPanel = () => shell(
  'Export Actions Panel',
  'Represents the shared SVG, PNG, and print actions provided through adapters-shared.',
  `
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button type="button" style="padding: 10px 14px; border-radius: 999px; border: 0; background: #0f4c81; color: #ffffff;">Export SVG</button>
      <button type="button" style="padding: 10px 14px; border-radius: 999px; border: 0; background: #1f6a9c; color: #ffffff;">Export PNG</button>
      <button type="button" style="padding: 10px 14px; border-radius: 999px; border: 0; background: #2c7b59; color: #ffffff;">Print Preview</button>
    </div>
  `,
);
