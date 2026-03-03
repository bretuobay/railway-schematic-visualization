# Storybook

Storybook is the interactive documentation surface for visual examples that are easier to inspect than static Markdown snippets.

## What It Covers

- core SVG rendering examples
- framework adapter control surfaces
- ecosystem package scenarios such as theming, i18n, SSR, canvas, and security

## Local Commands

```bash
npm run check:storybook
npm run storybook
npm run storybook:build
```

## Included Stories

- `Core/Renderer`
- `Adapters/Frameworks`
- `Ecosystem/Production Features`

## Notes

- The repo includes a safe Storybook wrapper. If Storybook is not installed in `node_modules`, the commands validate the configuration and exit cleanly.
- Install Storybook locally when you want the live UI rather than the scaffold verification path.
