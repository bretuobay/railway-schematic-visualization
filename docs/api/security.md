# Security API

Package: `@rail-schematic-viz/security`

Use this package when the deployment needs sanitization, validation, or explicit privacy-policy helpers.

## Key Exports

- `XSSSanitizer`
- `CSPValidator`
- `InputValidator`
- `PrivacyGuard`
- `PRIVACY_GUARANTEES`

## Responsibilities

- sanitize SVG and URL inputs
- validate CSP policies
- validate user-supplied coordinates, theme-like data, and translations
- expose privacy and disclosure policy helpers

## Related Pages

- [Themes API](/api/themes)
- [I18n API](/api/i18n)
