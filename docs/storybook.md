# Storybook

Storybook is the visual documentation surface for curated, screenshot-ready scenarios that are easier to inspect than isolated Markdown snippets.

## Why It Matters

- It shows how multiple packages combine into real operator-facing surfaces, not just small API fragments.
- It gives the docs site stable screenshots that can be regenerated from source-controlled stories.
- It keeps visual examples aligned with the same fixtures, labels, and workflows used in the published docs.

## Visual Highlights

### Theme + Locale Control Room

![Theme and locale control room](/images/storybook/storybook-control-room.png)

### Operations Dashboard

![Operations dashboard](/images/storybook/storybook-operations-dashboard.png)

## What It Covers

- `Introduction/Overview`: landing-page style visual summaries and the docs homepage hero screenshot source.
- `Core/Renderer`: realistic SVG, branching, overlays, and export preview boards.
- `Adapters/Frameworks`: React, Vue, and Web Component comparison and host-shell workflows.
- `Ecosystem/Production Features`: theming, i18n, plugins, context menus, SSR, canvas, security, and regional data scenarios.
- `Workflows/End-to-End`: large operational dashboards intended for documentation and publishing.

## Local Commands

```bash
npm run check:storybook
npm run storybook
npm run storybook:build
npm run storybook:screenshots
```

## How Screenshots Are Generated

1. `npm run storybook:build` writes the static Storybook output to `storybook-static/`.
2. `npm run storybook:screenshots` rebuilds Storybook and captures curated Chromium screenshots from specific story IDs.
3. The generated images are written to `docs/public/images/storybook/` and are then embedded into the VitePress site.

## Included Stories

- `Introduction/Overview`
- `Core/Renderer`
- `Adapters/Frameworks`
- `Ecosystem/Production Features`
- `Workflows/End-to-End`

## Notes

- Storybook stays on the HTML + Vite stack so the examples remain framework-agnostic and easy to maintain.
- The screenshot flow uses deterministic fixtures, fixed viewport capture, and story-specific selectors so the docs assets are reproducible.
