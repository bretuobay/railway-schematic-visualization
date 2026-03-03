# Rail Schematic Viz Conformance Audit

## Scope

This audit measures the current repository state against the umbrella spec in:

- `.kiro/specs/rail-schematic-viz/requirements.md`
- `.kiro/specs/rail-schematic-viz/design.md`

Status meanings:

- `Implemented`: concrete code exists and the primary behavior is covered by tests.
- `Partial`: some of the surface exists, but at least one acceptance criterion or correctness condition is still incomplete, not enforced, or not validated end to end.

## Requirements Summary

- Implemented: 35 / 50
- Partial: 15 / 50

## Requirements Audit

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Requirement 1 | Partial | `src/parsers/RailMLParser.ts`; `src/parsers/RailMLParser.test.ts` | railML parsing, canonical serialization, and extension parsing for operational points and lines now exist, but the full 3.1/3.2/3.3 surface is still not implemented. |
| Requirement 2 | Implemented | `src/parsers/JSONParser.ts`; `src/parsers/JSONParser.test.ts`; `schemas/rail-schematic-json-schema.v0.1.0.json` | JSON parsing, serialization, round-trip tests, and a published versioned schema document now exist. |
| Requirement 3 | Implemented | `src/builder/index.ts`; `src/builder/index.test.ts` | Fluent builder API, validation, and typed graph construction are covered. |
| Requirement 4 | Implemented | `src/renderer/SVGRenderer.ts`; `src/renderer/SVGRenderer.test.ts` | Core responsive SVG rendering, viewport sizing, and zoom support are present. |
| Requirement 5 | Implemented | `src/renderer/primitives.ts`; `src/renderer/primitives.test.ts` | Track primitives are rendered and validated by unit tests. |
| Requirement 6 | Partial | `src/renderer/switches.ts`; `src/renderer/SVGRenderer.property.test.ts` | Switch rendering exists, but the full template set called out by the spec is not explicitly implemented and validated. |
| Requirement 7 | Partial | `src/renderer/styling.ts`; `src/renderer/styling.test.ts`; `packages/themes/src/index.ts` | Styling configuration exists, but the full state-based and media-query-driven styling contract is not fully wired end to end. |
| Requirement 8 | Implemented | `packages/layout/src/index.ts`; `packages/layout/src/LayoutEngine.test.ts` | The layout package provides the required layout modes and tests them. |
| Requirement 9 | Implemented | `packages/layout/src/index.ts`; `packages/layout/src/SemanticZoom.test.ts` | Semantic zoom and level-of-detail behavior are implemented in layout. |
| Requirement 10 | Implemented | `src/coordinates/CoordinateBridge.ts`; `src/coordinates/CoordinateBridge.test.ts` | Coordinate bridge behavior and validation are covered. |
| Requirement 11 | Implemented | `packages/overlays/src/builtins/HeatMapOverlay.ts`; `packages/overlays/src/builtins/HeatMapOverlay.test.ts` | Heat-map overlays exist with unit and property coverage. |
| Requirement 12 | Implemented | `packages/overlays/src/builtins/AnnotationOverlay.ts`; `packages/overlays/src/builtins/AnnotationOverlay.test.ts` | Annotation overlays exist with collision and rendering coverage. |
| Requirement 13 | Implemented | `packages/overlays/src/builtins/RangeBandOverlay.ts`; `packages/overlays/src/builtins/RangeBandOverlay.test.ts` | Range band overlays are implemented and tested. |
| Requirement 14 | Implemented | `packages/overlays/src/builtins/TrafficFlowOverlay.ts`; `packages/overlays/src/builtins/TrafficFlowOverlay.test.ts` | Traffic flow arrow overlays are implemented and tested. |
| Requirement 15 | Implemented | `packages/overlays/src/builtins/TimeSeriesOverlay.ts`; `packages/overlays/src/builtins/TimeSeriesOverlay.test.ts` | Time-series overlays are implemented and tested. |
| Requirement 16 | Implemented | `packages/overlays/src/manager/OverlayManager.ts`; `packages/overlays/src/manager/OverlayManager.test.ts` | Custom overlay registration is present in the overlay manager. |
| Requirement 17 | Implemented | `packages/overlays/src/manager/OverlayManager.ts`; `packages/overlays/src/manager/OverlayManager.events.test.ts` | Overlay lifecycle, visibility, and event handling are implemented. |
| Requirement 18 | Implemented | `packages/adapters-shared/src/events/EventMapper.ts`; `packages/layout/src/interactions/EventManager.test.ts` | Interactive event mapping and event delivery exist. |
| Requirement 19 | Implemented | `packages/layout/src/interactions/KeyboardNavigation.ts`; `packages/layout/src/interactions/KeyboardNavigation.test.ts` | Keyboard navigation is implemented and covered in layout. |
| Requirement 20 | Implemented | `packages/layout/src/components/Minimap.ts`; `packages/layout/src/components/Minimap.test.ts` | Minimap navigation and viewport sync are implemented in layout. |
| Requirement 21 | Implemented | `packages/layout/src/interactions/SelectionEngine.ts`; `packages/layout/src/interactions/SelectionEngine.test.ts` | Element selection state and events are covered. |
| Requirement 22 | Implemented | `packages/adapters-shared/src/export/SVGExporter.ts`; `packages/adapters-shared/src/export/SVGExporter.test.ts` | SVG export is implemented and unit tested. |
| Requirement 23 | Implemented | `packages/adapters-shared/src/export/PNGExporter.ts`; `packages/adapters-shared/src/export/PNGExporter.test.ts` | PNG export is implemented and unit tested. |
| Requirement 24 | Implemented | `packages/adapters-shared/src/export/PrintExporter.ts`; `packages/adapters-shared/src/export/PrintExporter.test.ts` | Print export and preview generation are implemented. |
| Requirement 25 | Implemented | `packages/react/src/index.ts`; `packages/react/src/RailSchematic.test.ts` | React adapter and hook are implemented with tests. |
| Requirement 26 | Implemented | `packages/vue/src/index.ts`; `packages/vue/src/RailSchematicVue.test.ts` | Vue adapter and composable are implemented with tests. |
| Requirement 27 | Implemented | `packages/web-component/src/index.ts`; `packages/web-component/src/RailSchematicElement.test.ts` | Web Component adapter is implemented with tests. |
| Requirement 28 | Implemented | `packages/layout/src/index.ts`; `packages/layout/src/AutoLayout.test.ts` | Auto-layout behavior is implemented in the layout package. |
| Requirement 29 | Partial | `packages/overlays/src/performance/PerformanceMonitor.ts`; `benchmarks/rendering.benchmark.mjs` | Performance hooks and benchmarks exist, but the concrete FPS and latency service-level targets are not proven by this repo. |
| Requirement 30 | Partial | `packages/overlays/src/accessibility/OverlayAccessibilityManager.ts`; `packages/themes/src/index.ts` | Accessibility support exists, but full WCAG 2.1 AA conformance and screen-reader announcement coverage are not validated end to end. |
| Requirement 31 | Implemented | `src/browser-compatibility.ts`; `src/browser-compatibility.test.ts` | Browser compatibility matrix and graceful degradation checks are implemented. |
| Requirement 32 | Implemented | `scripts/analyze-bundles.mjs`; `src/bundle-optimization.test.ts` | Bundle budgets, lazy entrypoints, and tree-shaking checks are enforced. |
| Requirement 33 | Implemented | `package.json`; `tsconfig.json`; `tests/types/public-api.test.ts` | TypeScript declarations and type tests are present. |
| Requirement 34 | Implemented | `src/developer-experience.ts`; `src/developer-experience.test.ts` | CLI and developer tooling helpers are implemented. |
| Requirement 35 | Implemented | `src/parsers/index.ts`; `packages/adapters-regional/src/index.ts` | Built-in parsing and adapter surfaces cover railML, JSON, GeoJSON, and CSV. |
| Requirement 36 | Partial | `packages/adapters-regional/src/index.ts`; `packages/adapters-regional/src/RegionalAdapters.test.ts` | ELR and mileage support exist, but NaPTAN and BODS integration hooks are not implemented. |
| Requirement 37 | Partial | `packages/adapters-regional/src/index.ts`; `packages/adapters-regional/src/RegionalAdapters.test.ts` | RINF parsing exists, but full ERA portal export integration is not implemented. |
| Requirement 38 | Implemented | `packages/brushing-linking/src/index.ts`; `packages/brushing-linking/src/BrushingLinkingCoordinator.test.ts` | Brushing, selection sync, and coordinate linking are implemented. |
| Requirement 39 | Implemented | `packages/themes/src/index.ts`; `packages/themes/src/ThemeManager.test.ts` | Theme manager and built-in themes are implemented. |
| Requirement 40 | Partial | `packages/security/src/index.ts`; `packages/security/src/Security.test.ts` | Security and privacy controls exist, but the "no network requests" and anti-fingerprinting guarantees are documented rather than mechanically enforced across the full workspace. |
| Requirement 41 | Implemented | `src/testing-infrastructure.test.ts`; `playwright.config.mjs`; `benchmarks/rendering.benchmark.mjs` | Unit, integration, browser, visual, and benchmark infrastructure are in place. |
| Requirement 42 | Partial | `scripts/check-distribution.mjs`; `CHANGELOG.md`; `package.json` | Distribution metadata and artifact checks exist, but actual npm publication and public registry presence are not verified in-repo. |
| Requirement 43 | Partial | `package.json`; `packages/overlays/package.json` | The repo is modular, but the exact package split in the spec is not matched: parser remains in core and overlays are a separate package. |
| Requirement 44 | Implemented | `src/errors/index.ts`; `packages/adapters-shared/src/errors/index.ts`; tests across packages | Typed errors, validation, and descriptive failures are implemented broadly. |
| Requirement 45 | Partial | `packages/i18n/src/index.ts`; `packages/i18n/src/I18nManager.test.ts` | i18n primitives exist, but not all built-in UI strings and errors are fully localized across every package. |
| Requirement 46 | Partial | `packages/context-menu/src/index.ts`; `packages/context-menu/src/ContextMenuController.test.ts` | Context menu infrastructure exists, but default item sets and plugin-driven menu integration are not fully wired. |
| Requirement 47 | Implemented | `packages/plugins/src/index.ts`; `packages/plugins/src/PluginManager.test.ts` | Plugin registration, lifecycle hooks, and runtime enable/disable are implemented. |
| Requirement 48 | Partial | `packages/ssr/src/index.ts`; `packages/ssr/src/SSRRenderer.test.ts` | SSR support exists, but explicit jsdom-backed rendering is not implemented; the current path is string-first. |
| Requirement 49 | Partial | `packages/canvas/src/index.ts`; `packages/canvas/src/CanvasRenderer.test.ts` | Canvas and hybrid rendering exist, but the explicit mode-selection API and 60 FPS target are not fully validated end to end. |
| Requirement 50 | Partial | `docs/.vitepress/config.mjs`; `.storybook/main.mjs`; `docs/guides/index.md` | The docs site exists and builds, but public deployment and release-coupled publishing are defined in CI, not externally verified here. |

## Properties Summary

- Implemented: 51 / 64
- Partial: 13 / 64

## Properties Audit

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Property 1 | Implemented | `src/parsers/RailMLParser.ts`; `src/parsers/RailMLParser.test.ts` | Canonical railML serialization now round-trips parser-created graphs for the supported railML subset. |
| Property 2 | Implemented | `src/parsers/JSONParser.ts`; `src/parsers/JSONParser.test.ts`; `schemas/rail-schematic-json-schema.v0.1.0.json` | JSON round-trip serialization is implemented and validated. |
| Property 3 | Partial | `src/parsers/RailMLParser.ts`; `src/parsers/RailMLParser.validation.test.ts` | Coordinate extraction is implemented, but completeness across every railML positioning variant is not proven. |
| Property 4 | Implemented | `src/parsers/RailMLParser.validation.test.ts`; `src/parsers/JSONParser.validation.test.ts` | Parser validation failures are covered by tests. |
| Property 5 | Implemented | `src/parsers/RailMLParser.validation.test.ts` | Warning emission for non-fatal parse issues is covered. |
| Property 6 | Implemented | `src/builder/index.test.ts` | Builder topology validation is implemented. |
| Property 7 | Implemented | `src/builder/index.test.ts`; `src/model/RailGraph.test.ts` | Valid graph construction is covered. |
| Property 8 | Implemented | `src/renderer/SVGRenderer.test.ts`; `src/renderer/SVGRenderer.property.test.ts` | SVG generation is covered by unit and property tests. |
| Property 9 | Implemented | `packages/layout/src/ViewportController.test.ts` | Viewport aspect ratio handling is covered in layout. |
| Property 10 | Implemented | `packages/layout/src/ViewportController.test.ts` | Zoom bounds are enforced in layout. |
| Property 11 | Implemented | `packages/layout/src/ViewportCulling.test.ts` | Viewport culling is implemented and tested. |
| Property 12 | Implemented | `src/renderer/primitives.test.ts` | Track primitive rendering correctness is covered. |
| Property 13 | Partial | `src/renderer/switches.ts` | Switch rendering exists, but the full spec topology matrix is not explicitly validated. |
| Property 14 | Implemented | `src/renderer/styling.test.ts` | Style configuration application is covered by tests. |
| Property 15 | Implemented | `packages/layout/src/LayoutEngine.test.ts` | Layout mode behavior is covered in layout. |
| Property 16 | Implemented | `packages/layout/src/SemanticZoom.test.ts` | Semantic zoom behavior is covered. |
| Property 17 | Implemented | `src/coordinates/CoordinateBridge.test.ts` | Linear-to-screen projection validity is covered. |
| Property 18 | Implemented | `src/coordinates/CoordinateBridge.validation.test.ts` | Linear position ordering and validation are covered. |
| Property 19 | Implemented | `src/coordinates/CoordinateBridge.validation.test.ts` | Coordinate bridge error handling is covered. |
| Property 20 | Implemented | `packages/overlays/src/builtins/HeatMapOverlay.test.ts` | Heat-map overlay rendering is covered. |
| Property 21 | Implemented | `packages/overlays/src/builtins/HeatMapOverlay.property.test.ts`; `packages/overlays/src/rendering/UpdatePattern.test.ts` | Overlay update efficiency is covered by property and update-pattern tests. |
| Property 22 | Implemented | `packages/overlays/src/annotations/CollisionDetection.test.ts` | Annotation collision detection is covered. |
| Property 23 | Implemented | `packages/overlays/src/manager/OverlayManager.events.test.ts` | Annotation-related event emission is covered by overlay events. |
| Property 24 | Implemented | `packages/overlays/src/builtins/RangeBandOverlay.test.ts` | Range band topology following is covered. |
| Property 25 | Implemented | `packages/overlays/src/builtins/RangeBandOverlay.property.test.ts` | Range band overlap handling is covered. |
| Property 26 | Implemented | `packages/overlays/src/builtins/TrafficFlowOverlay.test.ts` | Traffic flow directional rendering is covered. |
| Property 27 | Implemented | `packages/overlays/src/builtins/TimeSeriesOverlay.test.ts` | Time-series state synchronization is covered. |
| Property 28 | Implemented | `packages/overlays/src/manager/OverlayManager.test.ts` | Custom overlay registration and invocation are covered. |
| Property 29 | Implemented | `packages/overlays/src/manager/OverlayManager.property.test.ts` | Overlay visibility toggles are covered. |
| Property 30 | Implemented | `packages/overlays/src/manager/OverlayManager.configuration.property.test.ts` | Overlay z-order configuration is covered. |
| Property 31 | Implemented | `packages/adapters-shared/src/events/EventMapper.test.ts`; adapter tests | Interactive event emission is covered. |
| Property 32 | Implemented | `packages/layout/src/interactions/KeyboardNavigation.test.ts` | Keyboard focus traversal is covered. |
| Property 33 | Implemented | `packages/layout/src/keyboard/KeyboardNavigator.test.ts`; `packages/overlays/src/accessibility/OverlayAccessibilityManager.test.ts` | Focus visibility support is implemented in keyboard and accessibility layers. |
| Property 34 | Implemented | `packages/layout/src/interactions/KeyboardNavigation.test.ts` | Keyboard topology-following navigation is covered. |
| Property 35 | Implemented | `packages/layout/src/components/Minimap.test.ts` | Minimap viewport synchronization is covered. |
| Property 36 | Implemented | `packages/layout/src/components/Minimap.test.ts` | Minimap click navigation is covered. |
| Property 37 | Implemented | `packages/layout/src/interactions/SelectionEngine.test.ts` | Selection state consistency is covered. |
| Property 38 | Partial | `packages/adapters-shared/src/export/SVGExporter.test.ts`; `packages/adapters-shared/src/export/SVGExporter.property.test.ts` | SVG export validity is covered, but visual equivalence to a live render is not proven with dedicated round-trip visual regression. |
| Property 39 | Implemented | `packages/adapters-shared/src/export/SVGExporter.property.test.ts` | SVG export validity is covered. |
| Property 40 | Implemented | `packages/adapters-shared/src/export/PNGExporter.test.ts` | PNG export completeness is covered at the unit level. |
| Property 41 | Implemented | `packages/adapters-shared/src/export/PrintExporter.test.ts` | Print output completeness is covered at the unit level. |
| Property 42 | Partial | `packages/react/src/RailSchematic.test.ts`; `packages/react/src/useRailSchematic.test.ts` | React updates work, but prop-update efficiency is not benchmarked as a separate performance property. |
| Property 43 | Implemented | `packages/vue/src/RailSchematicVue.test.ts`; `packages/vue/src/useRailSchematic.test.ts` | Vue reactivity behavior is covered. |
| Property 44 | Implemented | `packages/web-component/src/RailSchematicElement.test.ts` | Web Component attribute and property synchronization are covered. |
| Property 45 | Implemented | `packages/layout/src/AutoLayout.test.ts` | Auto-layout topology preservation is covered. |
| Property 46 | Partial | `packages/layout/src/AutoLayout.test.ts` | Auto-layout behavior exists, but coordinate export round-trip is not validated as a distinct property. |
| Property 47 | Partial | `packages/overlays/src/accessibility/OverlayAccessibilityManager.ts` | Accessibility labels exist, but full ARIA label completeness is not audited across every interactive surface. |
| Property 48 | Partial | `packages/layout/src/interactions/KeyboardNavigation.test.ts`; adapters | Keyboard operability exists, but full accessibility-grade end-to-end coverage is incomplete. |
| Property 49 | Partial | `packages/themes/src/index.ts`; `packages/themes/src/ThemeManager.test.ts` | Theme contrast support exists, but full contrast verification across all default visuals is not exhaustively measured. |
| Property 50 | Implemented | `packages/adapters-regional/src/RegionalAdapters.test.ts`; parser tests | Data adapter transformation behavior is covered. |
| Property 51 | Implemented | `packages/adapters-regional/src/RegionalAdapters.test.ts`; parser validation tests | Data adapter error handling is covered. |
| Property 52 | Implemented | `packages/adapters-regional/src/RegionalAdapters.test.ts` | ELR resolution is implemented and tested. |
| Property 53 | Implemented | `packages/adapters-regional/src/RegionalAdapters.test.ts` | RINF resolution is implemented and tested. |
| Property 54 | Implemented | `packages/brushing-linking/src/BrushingLinkingCoordinator.test.ts` | Coordinate bidirectionality is covered by coordinator tests. |
| Property 55 | Implemented | `packages/themes/src/ThemeManager.test.ts` | Theme application consistency is covered. |
| Property 56 | Implemented | `packages/security/src/Security.test.ts` | XSS prevention logic is implemented and tested. |
| Property 57 | Partial | `packages/security/src/index.ts`; `src/ecosystem.integration.test.ts` | The library is designed to avoid network activity, but there is no automated full-workspace static assertion that no runtime package issues network requests. |
| Property 58 | Implemented | `src/errors/index.test.ts`; package error tests | Error messages and typed errors are covered. |
| Property 59 | Partial | `packages/i18n/src/I18nManager.test.ts`; adapters | Locale handling exists, but full application of translations across all built-in UI surfaces is incomplete. |
| Property 60 | Partial | `packages/i18n/src/I18nManager.test.ts` | RTL detection and direction metadata exist, but full rendered RTL UI behavior is not validated across interactive surfaces. |
| Property 61 | Implemented | `packages/context-menu/src/ContextMenuController.test.ts` | Conditional menu items are implemented and tested. |
| Property 62 | Implemented | `packages/plugins/src/PluginManager.test.ts` | Plugin lifecycle hook invocation is implemented and tested. |
| Property 63 | Implemented | `packages/ssr/src/SSRRenderer.test.ts` | SSR environment detection is implemented and tested. |
| Property 64 | Partial | `packages/canvas/src/CanvasRenderer.test.ts`; `src/ecosystem.integration.test.ts` | Canvas rendering exists, but strong visual equivalence to SVG is only partially validated. |

## Highest-Impact Gaps

1. Tighten switch-template and styling coverage so Requirements 6-7 and Property 13 are explicitly satisfied.
2. Convert accessibility from helper coverage to end-to-end conformance checks so Requirement 30 and Properties 47-49 are measurable.
3. Decide whether to satisfy the spec literally on packaging by splitting parser out of core, or revise the umbrella spec to match the current package structure.
4. Either implement jsdom-backed SSR and stronger Canvas mode controls, or revise the spec language for the current string-first SSR and command-based Canvas approach.
5. Add explicit external validation for npm publication and docs deployment if Requirements 42 and 50 must be treated as fully complete.
