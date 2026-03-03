# Framework Integration

Use this guide when the schematic must live inside a React, Vue, or framework-agnostic browser UI.

## Choose The Right Adapter

- React app: `@rail-schematic-viz/react`
- Vue app: `@rail-schematic-viz/vue`
- Design system, CMS, mixed-framework host, or no framework: `@rail-schematic-viz/web-component`

All three adapters share the same lifecycle, export, and event-mapping foundation from `@rail-schematic-viz/adapters-shared`.

## Shared Contract

- Build a `RailGraph` before it reaches the adapter boundary.
- Treat export, viewport, and overlay actions as imperative controls.
- Expect the same SVG, PNG, and print capabilities across adapters.

## React Pattern

Use `RailSchematic` when you want a declarative component surface, and `useRailSchematic` when you want more granular control around lifecycle and imperative actions.

## Vue Pattern

Use `RailSchematicVue` for the component shell and `useRailSchematic` when composition-driven control is a better fit than template-only usage.

## Web Component Pattern

Use `RailSchematicElement` when the host application cannot depend on React or Vue. Prefer the `data` property for a `RailGraph` instance and reserve the `data` attribute for JSON-fed integrations.

## Integration Checklist

- Verify the adapter receives a real `RailGraph`
- Verify event handlers are mapped through the expected framework surface
- Verify exports work from the same adapter instance used for rendering
- Verify teardown is called when components unmount or detach

## Next Step

Move to [Production Rollout](/guides/production-rollout) before enabling SSR, canvas, export-heavy flows, or wider browser support.
