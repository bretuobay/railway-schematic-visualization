# API Reference

This section is the human-maintained API map for every public package in the workspace. Each page below summarizes the main exports, expected inputs, and the right time to use that package.

## Core Platform

- [Core API](/api/core): graph construction, parsers, coordinates, `SVGRenderer`, `RailSchematicCLI`, and DX helpers.
- [Layout API](/api/layout): viewport control, fit-to-view, interaction, and event orchestration.
- [Overlays API](/api/overlays): overlay layers, legends, rendering helpers, and spatial utilities.

## Framework Adapters

- [Adapters Shared API](/api/adapters-shared): export, lifecycle, and event-mapping primitives used by all adapters.
- [React API](/api/react): `RailSchematic` and `useRailSchematic`.
- [Vue API](/api/vue): `RailSchematicVue` and `useRailSchematic`.
- [Web Component API](/api/web-component): `RailSchematicElement` and registration helpers.

## Ecosystem Packages

- [Themes API](/api/themes): theme contracts, built-in themes, and `ThemeManager`.
- [I18n API](/api/i18n): locale registration, translation lookup, formatting, and RTL support.
- [Plugins API](/api/plugins): plugin contracts and `PluginManager`.
- [Context Menu API](/api/context-menu): menu item contracts and `ContextMenuController`.
- [Regional Adapters API](/api/adapters-regional): CSV, GeoJSON, ELR, and RINF ingestion.
- [Brushing And Linking API](/api/brushing-linking): linked selections and viewport synchronization.
- [SSR API](/api/ssr): server-side SVG rendering and headless exports.
- [Canvas API](/api/canvas): canvas and hybrid rendering surfaces.
- [Security API](/api/security): sanitization, CSP validation, input validation, and privacy guarantees.

## How To Use This Section

1. Start with the package you plan to install.
2. Use the package page to identify the small set of exports you actually need.
3. Cross-check [Getting Started](/getting-started) for setup flow and [Package Structure](/package-structure) for dependency boundaries.

## Operational References

- [Testing Guidelines](/testing-guidelines)
- [Versioning Policy](/versioning-policy)
- [Bundle Size](/bundle-size)
