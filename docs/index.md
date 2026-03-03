---
layout: home

hero:
  name: Rail Schematic Viz
  text: Typed railway schematic visualization for production use
  tagline: Modular rendering, interactions, overlays, exports, framework adapters, and ecosystem tooling.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api-reference

features:
  - title: Package-first architecture
    details: Install only the packages you need, from the core renderer up to adapters and ecosystem features.
  - title: Production tooling
    details: Built-in bundle budgets, distribution checks, browser compatibility guidance, and testing gates.
  - title: Framework-ready
    details: React, Vue, and Web Component adapters share a common lifecycle and export system.
---

## Why Rail Schematic Viz?

The library is organized for real deployments:

- `@rail-schematic-viz/core` for graph data, parsing, coordinates, rendering, and CLI helpers.
- `@rail-schematic-viz/layout` and `@rail-schematic-viz/overlays` for interactions and rich overlays.
- Adapter packages for framework integration.
- Ecosystem packages for theming, i18n, plugins, SSR, canvas, security, and regional data ingestion.

## Visual Preview

The published docs now reuse curated Storybook scenes, so the screenshots reflect the same scenario demos you can inspect locally.

![Docs hero preview](/images/storybook/docs-home-hero.png)

Use the dedicated [Storybook](/storybook) page to see which scenarios back these visuals and how to regenerate them.

## Start Here

If you are new to the library, begin with the [Getting Started](/getting-started) guide. It covers package installation for npm, yarn, and pnpm, a minimal hello-world render, framework examples, and common troubleshooting paths.

## Implementation Guides

When you move beyond a prototype, use the [Guides](/guides/) section for deeper setup, framework integration, production rollout, and migration planning.

## Documentation Scope

This site is structured for VitePress and includes:

- full-text local search
- responsive layouts out of the box
- dark mode support
- version navigation
- offline-friendly manifest and service worker hooks

Use the sidebar to move between setup, API, package guidance, and operational reference docs.
