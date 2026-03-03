# Browser Compatibility Matrix

`rail-schematic-viz` supports the following browser baselines for production use:

| Browser | Minimum Version | Notes |
| --- | --- | --- |
| Chrome | 115+ | Primary Chromium baseline for development and CI. |
| Firefox | 119+ | Required for Firefox-specific input and layout verification. |
| Safari | 17+ | WebKit baseline used for Safari desktop compatibility. |
| Edge | 115+ | Chromium Edge baseline, tested separately for enterprise deployments. |

## Polyfill Guidance

The library does not auto-inject polyfills. Applications should provide targeted polyfills only when feature detection shows a gap:

- `ResizeObserver`: required for responsive viewport and resize-aware controls.
- `structuredClone`: required for deep-copy export, adapter snapshots, and some plugin state flows.
- `PointerEvent`: required for richer pointer interactions such as brushing and drag gestures.
- `OffscreenCanvas`: optional optimization for worker-backed dense canvas layers.
- `Intl.Segmenter`: optional enhancement for locale-aware text truncation.

## Unsupported Browsers

When a browser falls below the supported baseline, the compatibility helper emits warnings so host applications can:

1. Show a non-blocking banner.
2. Disable advanced optional features.
3. Guide the user to a supported browser or managed enterprise image.
