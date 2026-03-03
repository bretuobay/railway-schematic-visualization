const baseShell = (title, body, footer) => `
  <section class="story-card">
    <h2 style="margin: 0 0 8px; font-size: 1.4rem;">${title}</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">${body}</p>
    ${footer}
  </section>
`;

export default {
  title: 'Core/Renderer',
  parameters: {
    docs: {
      description: {
        component: 'Interactive examples for the core graph model and SVG rendering entrypoint.',
      },
    },
  },
};

export const MinimalSVGRender = () => baseShell(
  'Minimal SVG Render',
  'Shows the smallest useful schematic: two nodes, one edge, and a renderer output placeholder.',
  `
    <div style="padding: 16px; border-radius: 14px; background: #ffffff; border: 1px solid rgba(15, 76, 129, 0.12);">
      <svg viewBox="0 0 220 80" width="100%" role="img" aria-label="Minimal rail schematic">
        <line x1="40" y1="40" x2="180" y2="40" stroke="#0f4c81" stroke-width="8" stroke-linecap="round" />
        <circle cx="40" cy="40" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4" />
        <circle cx="180" cy="40" r="10" fill="#ffffff" stroke="#0f4c81" stroke-width="4" />
        <text x="40" y="68" text-anchor="middle" font-size="12" fill="#132534">Origin</text>
        <text x="180" y="68" text-anchor="middle" font-size="12" fill="#132534">Destination</text>
      </svg>
    </div>
  `,
);

export const StyledRenderVariants = () => baseShell(
  'Styled Render Variants',
  'Demonstrates how theme and renderer styling change line weight, station treatment, and visual emphasis.',
  `
    <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      <div style="padding: 12px; border-radius: 14px; background: #ffffff;">
        <strong style="display: block; margin-bottom: 8px;">Default</strong>
        <div style="height: 10px; border-radius: 999px; background: linear-gradient(90deg, #0f4c81, #3a88c8);"></div>
      </div>
      <div style="padding: 12px; border-radius: 14px; background: #0c1822; color: #f4fbff;">
        <strong style="display: block; margin-bottom: 8px;">Dark</strong>
        <div style="height: 10px; border-radius: 999px; background: linear-gradient(90deg, #73c7ff, #d7f3ff);"></div>
      </div>
      <div style="padding: 12px; border-radius: 14px; background: #ffffff; border: 2px solid #111111;">
        <strong style="display: block; margin-bottom: 8px;">High Contrast</strong>
        <div style="height: 10px; border-radius: 999px; background: #111111;"></div>
      </div>
    </div>
  `,
);
