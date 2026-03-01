# Implementation Plan: rail-schematic-viz-ecosystem

## Overview

This implementation plan breaks down the rail-schematic-viz-ecosystem package into discrete coding tasks. This is the final package (5 of 5) in the Rail Schematic Viz library, providing production-ready features including theme system, internationalization (i18n), plugin architecture, context menu system, regional data adapters (UK ELR, EU RINF, CSV, GeoJSON), brushing and linking, server-side rendering (SSR), Canvas rendering fallback, security features, bundle optimization, and comprehensive documentation.

This package transforms the library from a technical foundation into a fully-featured, enterprise-ready solution suitable for deployment in diverse environments. It builds on all previous packages (@rail-schematic-viz/core, @rail-schematic-viz/layout, @rail-schematic-viz/overlays, @rail-schematic-viz/adapters) to provide a complete ecosystem.

The implementation follows a modular approach with independent subsystems that can be tree-shaken. Each subsystem (themes, i18n, plugins, adapters, SSR, Canvas, security) is implemented as a separate sub-package for optimal bundle size and developer experience.

## Tasks

- [ ] 1. Set up ecosystem package structure and configuration
  - Create monorepo structure with sub-packages (themes, i18n, plugins, context-menu, adapters-regional, brushing-linking, ssr, canvas, security)
  - Configure TypeScript with strict mode for all packages
  - Set up ESM exports with tree-shaking support
  - Configure Vitest with fast-check for property-based testing
  - Set up package.json with peer dependencies (D3 v7, core packages)
  - Mark side-effect-free modules in package.json for tree-shaking
  - Create shared tsconfig.base.json for all sub-packages
  - _Requirements: 31.1, 31.2, 31.3, 31.4, 32.1, 32.2, 32.3, 47.1, 47.3, 49.1-49.7_

- [ ] 2. Implement theme system (@rail-schematic-viz/themes)
  - [ ] 2.1 Define theme type definitions and interfaces
    - Create Theme interface with colors, typography, sizing, accessibility properties
    - Create ThemeColors interface with track, element, UI, and state colors
    - Create ThemeTypography interface with fontFamily, fontSize, fontWeight
    - Create ThemeSizing interface with trackWidth, markerSize, iconSize, lineWidth
    - Create ThemeAccessibility interface with contrastRatio, focusIndicator, patterns
    - Create ValidationResult and ContrastViolation types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.6_
  
  - [ ] 2.2 Implement ThemeManager class
    - Implement registerTheme method for theme registration
    - Implement setTheme method for runtime theme switching
    - Implement getTheme and getCurrentTheme query methods
    - Implement listThemes method returning registered theme names
    - Implement createTheme method for extending base themes
    - Implement validateTheme method checking contrast requirements
    - Generate CSS custom properties (--rail-*) from theme objects
    - Update CSS custom properties within 100ms when theme changes
    - Emit theme-change events when theme is updated
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 6.2, 6.3, 6.4, 6.5, 6.8, 7.1, 7.2, 7.6, 7.7, 7.8_
  
  - [ ] 2.3 Implement default theme definitions
    - Create default theme with standard railway schematic colors (blue main lines, green branch lines, red closed tracks)
    - Ensure default theme meets WCAG 2.1 AA contrast requirements (4.5:1 text, 3:1 interactive)
    - Create dark mode theme optimized for low-light environments
    - Create high-contrast theme meeting WCAG 2.1 AAA requirements (7:1 normal text, 4.5:1 large text)
    - Create color-blind safe theme distinguishable for deuteranopia and protanopia
    - Use patterns and textures in addition to colors for accessibility themes
    - Apply default theme automatically when no theme specified
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ]* 2.4 Write property tests for theme system
    - **Property 1: Theme Application Preserves Viewport State** - Validates: Requirements 1.7, 7.5
    - **Property 2: Theme Contrast Validation** - Validates: Requirements 1.8, 6.3
    - **Property 3: Theme Round-Trip Consistency** - Validates: Requirements 6.2, 6.5
    - **Property 23: Theme CSS Custom Property Generation** - Validates: Requirements 1.7
  
  - [ ]* 2.5 Write unit tests for theme system
    - Test theme registration and retrieval
    - Test theme switching without re-render
    - Test viewport state preservation during theme switch
    - Test contrast validation for custom themes
    - Test CSS custom property generation
    - Test theme-change event emission
    - Test default theme application
    - Test all built-in themes meet contrast requirements
    - _Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.8, 4.1-4.8, 5.1-5.8, 6.1-6.8, 7.1-7.8_

- [ ] 3. Implement internationalization system (@rail-schematic-viz/i18n)
  - [ ] 3.1 Define i18n type definitions and interfaces
    - Create I18nManager interface with registerLocale, setLocale, getLocale, t methods
    - Create Translations type as nested object with string values
    - Create TranslationKey type as string
    - Create NumberFormatOptions and DateFormatOptions interfaces
    - _Requirements: 8.1, 8.2, 8.3, 8.8_
  
  - [ ] 3.2 Implement I18nManager class
    - Implement registerLocale method for adding translations
    - Implement setLocale method for changing active locale
    - Implement getLocale and listLocales query methods
    - Implement t method for translation retrieval with parameter substitution
    - Implement formatNumber method using Intl.NumberFormat
    - Implement formatDate method using Intl.DateTimeFormat
    - Implement isRTL method detecting RTL locales (Arabic, Hebrew, Persian, Urdu)
    - Fall back to default locale (en-US) when translation key not found
    - Emit warnings when translation keys are not found
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.5, 10.6, 11.1_
  
  - [ ] 3.3 Implement default locale translations
    - Create English (en-US) translations as default locale
    - Include translations for zoom controls, minimap, overlay controls
    - Include translations for context menu items and keyboard shortcuts
    - Include translations for error messages and validation warnings
    - Use clear, concise language appropriate for technical users
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [ ] 3.4 Implement multi-language support
    - Support locale identifiers in BCP 47 format (en-US, fr-FR, de-DE)
    - Support partial translations with fallback to default locale
    - Document translation key structure for all localizable strings
    - Provide translation templates for common languages
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8_
  
  - [ ] 3.5 Implement RTL text direction support
    - Detect RTL locales and apply RTL text direction to labels
    - Mirror UI controls (minimap, zoom controls) for RTL layouts
    - Maintain LTR direction for schematic topology
    - Apply CSS direction property based on locale
    - Support mixed LTR and RTL content in labels
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [ ]* 3.6 Write property tests for i18n system
    - **Property 4: Translation Fallback Consistency** - Validates: Requirements 8.6, 9.8
    - **Property 5: Translation Parameter Substitution** - Validates: Requirements 8.4
    - **Property 6: RTL Text Direction Application** - Validates: Requirements 11.2, 11.4
    - **Property 26: Locale Number Formatting** - Validates: Requirements 10.5
  
  - [ ]* 3.7 Write unit tests for i18n system
    - Test locale registration and switching
    - Test translation retrieval with fallback
    - Test parameter substitution in translations
    - Test number and date formatting for different locales
    - Test RTL locale detection and text direction
    - Test missing translation key warnings
    - _Requirements: 8.1-8.8, 9.1-9.8, 10.1-10.8, 11.1-11.8_

- [ ] 4. Checkpoint - Ensure theme and i18n tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement plugin system (@rail-schematic-viz/plugins)
  - [ ] 5.1 Define plugin type definitions and interfaces
    - Create Plugin interface with initialize, beforeRender, afterRender, onViewportChange, onDataUpdate, destroy hooks
    - Create PluginContext interface with graph, renderer, coordinateBridge, options
    - Create RenderContext interface with graph, renderer, viewport, svgRoot
    - Create PluginOptions type as flexible record
    - Create PluginInfo interface with name, enabled, options
    - _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7, 12.8_
  
  - [ ] 5.2 Implement PluginManager class
    - Implement registerPlugin method accepting name, plugin, and options
    - Implement enablePlugin and disablePlugin methods
    - Implement unregisterPlugin method
    - Implement listPlugins and isPluginEnabled query methods
    - Validate plugins implement required interface on registration
    - Provide plugins access to RailGraph, Renderer, and CoordinateBridge
    - Emit plugin-registered, plugin-enabled, plugin-disabled events
    - _Requirements: 12.4, 12.5, 12.6, 12.7, 12.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.8_
  
  - [ ] 5.3 Implement plugin lifecycle management
    - Invoke initialize hook when plugin is registered
    - Invoke beforeRender hook before each render cycle
    - Invoke afterRender hook after each render cycle
    - Invoke onViewportChange hook when viewport changes
    - Invoke onDataUpdate hook when RailGraph data changes
    - Invoke destroy hook when plugin is unregistered
    - Pass context objects (renderer, graph, viewport) to lifecycle hooks
    - Wrap all hook invocations in try-catch for error isolation
    - Log plugin errors without crashing renderer
    - Skip lifecycle hooks for disabled plugins
    - Re-invoke initialize hook when plugin is re-enabled
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.6, 14.7_
  
  - [ ]* 5.4 Write property tests for plugin system
    - **Property 7: Plugin Lifecycle Execution Order** - Validates: Requirements 13.1, 13.2, 13.3, 13.6
    - **Property 8: Plugin Error Isolation** - Validates: Requirements 13.8
    - **Property 9: Plugin Enable/Disable State** - Validates: Requirements 14.2, 14.6, 14.7
    - **Property 24: Plugin Configuration Persistence** - Validates: Requirements 12.7
  
  - [ ]* 5.5 Write unit tests for plugin system
    - Test plugin registration and lifecycle hooks
    - Test plugin enable/disable functionality
    - Test plugin error isolation
    - Test lifecycle hook execution order
    - Test context object passing to hooks
    - Test plugin configuration persistence
    - _Requirements: 12.1-12.8, 13.1-13.8, 14.1-14.8_

- [ ] 6. Implement context menu system (@rail-schematic-viz/context-menu)
  - [ ] 6.1 Define context menu type definitions and interfaces
    - Create ContextMenuManager interface with registerMenuItem, unregisterMenuItem, show, hide, isVisible methods
    - Create MenuItem interface with id, label, icon, action, visible, disabled, separator, submenu properties
    - Support dynamic label functions based on element
    - Support conditional visibility functions
    - _Requirements: 15.1, 15.8, 17.1, 17.2, 17.3, 17.4, 17.7_
  
  - [ ] 6.2 Implement ContextMenuManager class
    - Implement registerMenuItem and unregisterMenuItem methods
    - Implement show method displaying menu on right-click
    - Implement hide method closing menu
    - Implement isVisible query method
    - Position menu near cursor while staying within viewport bounds
    - Close menu when clicking outside or pressing Escape
    - Support keyboard navigation with arrow keys and Enter
    - Emit events when menu items are selected
    - _Requirements: 15.1, 15.2, 15.5, 15.6, 15.7, 15.8_
  
  - [ ] 6.3 Implement MenuRenderer component
    - Render menu with element-specific actions based on element type
    - Support nested submenus for organizing related actions
    - Support item separators for grouping
    - Support item icons using SVG or icon font classes
    - Support disabled items with visual indication
    - Invoke action callbacks with element data and event context
    - _Requirements: 15.3, 15.4, 17.3, 17.4, 17.5, 17.6_
  
  - [ ] 6.4 Implement default context menu items
    - Create "View Details" item emitting element data
    - Create "Select Connected" item selecting topologically connected elements
    - Create "Export Selection" item exporting selected elements as SVG
    - Create "Copy Coordinates" item copying element position to clipboard
    - Create "Zoom to Element" item fitting element in viewport
    - Create "Hide Element" item temporarily hiding element
    - Support conditional items appearing only for specific element types
    - Support disabling default items via configuration
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  
  - [ ]* 6.5 Write property tests for context menu system
    - **Property 10: Context Menu Positioning** - Validates: Requirements 15.2
    - **Property 11: Context Menu Item Visibility** - Validates: Requirements 17.6
    - **Property 25: Context Menu Keyboard Navigation** - Validates: Requirements 15.6
  
  - [ ]* 6.6 Write unit tests for context menu system
    - Test menu registration and display
    - Test menu positioning within viewport bounds
    - Test keyboard navigation
    - Test item visibility conditions
    - Test default menu items
    - Test custom menu items
    - _Requirements: 15.1-15.8, 16.1-16.8, 17.1-17.8_

- [ ] 7. Implement regional data adapters (@rail-schematic-viz/adapters-regional)
  - [ ] 7.1 Implement CSV adapter
    - Create CSVAdapter class with parse method
    - Parse CSV files with columns for Line ID, Start Mileage, End Mileage
    - Support optional columns for Station Name, Track Type, Speed Limit
    - Convert CSV rows into RailGraph nodes and edges
    - Support configurable column mappings for flexible CSV formats
    - Support configurable delimiters (comma, semicolon, tab)
    - Support CSV files with or without headers
    - Return descriptive errors with row numbers for invalid CSV
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_
  
  - [ ] 7.2 Implement GeoJSON adapter
    - Create GeoJSONAdapter class with parse method
    - Parse GeoJSON FeatureCollections with LineString geometries
    - Extract geographic coordinates from LineString geometries
    - Extract linear referencing properties from feature properties
    - Support GeoJSON with properties for track ID, name, and type
    - Convert GeoJSON features into RailGraph nodes and edges
    - Support coordinate reference systems (CRS) including WGS84 and EPSG codes
    - Return descriptive errors with feature IDs for invalid GeoJSON
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_
  
  - [ ] 7.3 Implement UK ELR adapter
    - Create ELRAdapter class with resolveELR, parseMileage, toLinearPosition methods
    - Resolve Engineer's Line Reference (ELR) codes to track identifiers
    - Parse UK mileage notation in Miles and Chains format (e.g., "42m 35ch")
    - Convert Miles and Chains to decimal metres (1 mile = 80 chains)
    - Support ELR direction indicators (up, down)
    - Provide mapping between ELR/mileage and LinearPosition coordinates
    - Support integration with NaPTAN station identifiers
    - Return errors with invalid ELR code when not found
    - Document ELR reference data source and update process
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_
  
  - [ ] 7.4 Implement EU RINF adapter
    - Create RINFAdapter class with resolveSectionOfLine, resolveOperationalPoint, parse methods
    - Resolve RINF section-of-line identifiers to track identifiers
    - Resolve RINF operational point identifiers to station references
    - Support RINF track section identifiers as LinearPosition track references
    - Provide mapping between RINF identifiers and RailGraph model
    - Support integration with ERA RINF portal data exports
    - Parse RINF XML or JSON data formats
    - Return errors with invalid identifier when not found
    - Document RINF data source and update process
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_
  
  - [ ]* 7.5 Write property tests for regional adapters
    - **Property 12: CSV Adapter Round-Trip** - Validates: Requirements 18.8
    - **Property 13: GeoJSON Coordinate Transformation** - Validates: Requirements 19.2, 19.6
    - **Property 14: UK Mileage Conversion Accuracy** - Validates: Requirements 20.2, 20.3
    - **Property 27: ELR Direction Indicator Handling** - Validates: Requirements 20.4
    - **Property 28: RINF Identifier Resolution** - Validates: Requirements 21.1, 21.4
  
  - [ ]* 7.6 Write unit tests for regional adapters
    - Test CSV parsing with various formats and delimiters
    - Test CSV round-trip consistency
    - Test GeoJSON parsing with different CRS
    - Test UK ELR resolution and mileage conversion
    - Test EU RINF identifier resolution
    - Test error handling for invalid data
    - _Requirements: 18.1-18.8, 19.1-19.8, 20.1-20.8, 21.1-21.8_

- [ ] 8. Checkpoint - Ensure context menu and adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement brushing and linking system (@rail-schematic-viz/brushing-linking)
  - [ ] 9.1 Define brushing and linking type definitions
    - Create BrushingLinkingCoordinator interface with registerView, unregisterView, selectElements, clearSelection, syncViewport methods
    - Create LinkedView interface with id, onSelectionChange, onViewportChange, getCoordinateSystem methods
    - Create CoordinateSystemType enum
    - _Requirements: 22.1, 22.2, 22.4, 22.8_
  
  - [ ] 9.2 Implement BrushingLinkingCoordinator class
    - Implement registerView and unregisterView methods
    - Maintain shared selection state across views
    - Implement selectElements method with source view ID to prevent loops
    - Implement clearSelection method
    - Implement syncViewport method for viewport synchronization
    - Emit selection-change events to all registered views
    - Support bidirectional coordinate transformation
    - _Requirements: 22.2, 22.3, 22.5, 22.6, 22.7_
  
  - [ ] 9.3 Implement coordinate transformation for linking
    - Emit events with ScreenCoordinate and GeographicCoordinate when element selected
    - Provide method to highlight elements by GeographicCoordinate
    - Provide method to highlight elements by LinearPosition
    - Support bidirectional transformation between all coordinate systems
    - Handle coordinate transformation errors gracefully
    - Emit viewport-change events with coordinates in all supported systems
    - Support synchronized panning between schematic and geographic views
    - Maintain selection state consistency across coordinate transformations
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8_
  
  - [ ]* 9.4 Write property tests for brushing and linking
    - **Property 15: Brushing and Linking Selection Synchronization** - Validates: Requirements 22.3, 23.7
    - **Property 16: Coordinate Transformation Bidirectionality** - Validates: Requirements 23.4, 23.8
    - **Property 29: Viewport Synchronization Across Views** - Validates: Requirements 22.7
  
  - [ ]* 9.5 Write unit tests for brushing and linking
    - Test view registration and selection synchronization
    - Test coordinate transformation between systems
    - Test viewport synchronization
    - Test selection state consistency
    - Test error handling for coordinate transformation
    - _Requirements: 22.1-22.8, 23.1-23.8_

- [ ] 10. Implement server-side rendering (@rail-schematic-viz/ssr)
  - [ ] 10.1 Implement SSR environment detection and setup
    - Detect Node.js environment (version 18+)
    - Disable browser-specific features in Node.js
    - Set up jsdom for DOM emulation in Node.js
    - Document SSR setup and configuration requirements
    - _Requirements: 24.1, 24.2, 24.4, 24.7_
  
  - [ ] 10.2 Implement SSRRenderer class
    - Create SSRRenderer with render method for server-side SVG generation
    - Accept RailGraph data and configuration options
    - Return SVG markup as string
    - Support all layout modes and overlay types
    - Support configurable dimensions and styling
    - Handle errors gracefully with descriptive messages
    - Provide error handling for SSR-specific issues
    - _Requirements: 24.3, 24.6, 25.2, 25.3, 25.4, 25.6, 25.7_
  
  - [ ] 10.3 Implement HeadlessExport API
    - Create headlessExport method for batch SVG generation
    - Accept RailGraph data and configuration options
    - Complete within 2 seconds for networks with 1000 elements
    - Support batch processing of multiple schematics
    - Process each request independently in batch mode
    - Handle failures in individual requests without affecting others
    - Return results with error details for failed requests
    - _Requirements: 25.1, 25.5, 25.8_
  
  - [ ] 10.4 Implement SSR framework integration examples
    - Provide examples of SSR with Next.js
    - Provide examples of SSR with Nuxt frameworks
    - Document SSR usage patterns
    - _Requirements: 24.8_
  
  - [ ]* 10.5 Write property tests for SSR
    - **Property 17: SSR SVG Generation Completeness** - Validates: Requirements 25.3, 25.4
    - **Property 30: SSR Batch Export Consistency** - Validates: Requirements 25.8
  
  - [ ]* 10.6 Write unit tests for SSR
    - Test SSR rendering in Node.js environment
    - Test headless export API
    - Test batch export with multiple requests
    - Test error handling for SSR-specific issues
    - Test performance for 1000-element networks
    - _Requirements: 24.1-24.8, 25.1-25.8_

- [ ] 11. Implement Canvas rendering (@rail-schematic-viz/canvas)
  - [ ] 11.1 Implement CanvasRenderer class
    - Create CanvasRenderer with render, clear, hitTest methods
    - Render dense data layers using HTML5 Canvas
    - Maintain visual consistency with SVG output
    - Render heat-maps with up to 10000 data points at 60 FPS
    - Implement hit detection for event handling on Canvas elements
    - Lazy-load Canvas-specific code to minimize bundle size
    - Support exporting Canvas-rendered content as PNG or SVG
    - _Requirements: 26.1, 26.4, 26.5, 26.6, 26.7, 26.8_
  
  - [ ] 11.2 Implement HybridRenderer class
    - Create HybridRenderer combining SVG and Canvas
    - Render interactive elements (tracks, stations, signals) using SVG
    - Render dense data layers (heat-maps with >1000 points) using Canvas
    - Layer Canvas elements behind SVG elements for proper z-ordering
    - Synchronize Canvas and SVG coordinate systems
    - Update Canvas layers independently without re-rendering SVG
    - Support event handling on Canvas-rendered elements via hit detection
    - Maintain 60 FPS performance with hybrid rendering for 5000+ elements
    - Provide configuration to control which layers use Canvas vs SVG
    - _Requirements: 26.2, 26.3, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8_
  
  - [ ]* 11.3 Write property tests for Canvas rendering
    - **Property 18: Canvas Hit Detection Accuracy** - Validates: Requirements 26.7
    - **Property 19: Hybrid Rendering Visual Consistency** - Validates: Requirements 27.4
  
  - [ ]* 11.4 Write unit tests for Canvas rendering
    - Test Canvas rendering with dense data layers
    - Test hybrid rendering with SVG and Canvas
    - Test hit detection accuracy
    - Test coordinate system synchronization
    - Test performance with 10000 data points
    - Test visual consistency between SVG and Canvas
    - _Requirements: 26.1-26.8, 27.1-27.8_

- [ ] 12. Checkpoint - Ensure SSR and Canvas tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement security features (@rail-schematic-viz/security)
  - [ ] 13.1 Implement XSSSanitizer class
    - Create XSSSanitizer with sanitizeText, sanitizeSVG, sanitizeURL, validateAttribute methods
    - Sanitize all user-provided text content before rendering
    - Escape HTML special characters in labels, tooltips, and annotations
    - Validate that SVG content does not contain script elements
    - Use textContent instead of innerHTML for text rendering
    - Validate URL inputs for href and xlink:href attributes
    - Do not use eval() or Function() constructor with user input
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.8_
  
  - [ ] 13.2 Implement CSPValidator class
    - Create CSPValidator with validateCSP, getRequiredDirectives, checkCompatibility methods
    - Ensure no inline styles requiring 'unsafe-inline' CSP directive
    - Ensure no inline scripts requiring 'unsafe-inline' CSP directive
    - Ensure no eval() requiring 'unsafe-eval' CSP directive
    - Support nonce-based CSP for any required inline content
    - Document required CSP directives for library functionality
    - Provide configuration for CSP-compatible operation
    - Emit warnings when CSP restrictions prevent functionality
    - Work with CSP directive: "default-src 'self'; style-src 'self' 'nonce-{random}'"
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8_
  
  - [ ] 13.3 Implement InputValidator class
    - Create InputValidator with validateCoordinate, validateNodeId, validateTheme, validateTranslations methods
    - Validate all input data to prevent injection attacks
    - Provide descriptive validation errors
    - _Requirements: 30.8_
  
  - [ ] 13.4 Implement data privacy features
    - Ensure library makes no network requests from core code
    - Ensure no telemetry data collection or transmission
    - Ensure no Canvas fingerprinting techniques
    - Ensure no data storage in cookies or local storage without explicit configuration
    - Ensure no third-party tracking scripts or analytics
    - Document data handling practices in privacy policy
    - Provide security policy for reporting vulnerabilities
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7_
  
  - [ ]* 13.5 Write property tests for security features
    - **Property 20: XSS Sanitization Safety** - Validates: Requirements 28.2, 28.3, 28.4, 28.8
    - **Property 21: CSP Compliance Validation** - Validates: Requirements 29.1, 29.2, 29.3
  
  - [ ]* 13.6 Write unit tests for security features
    - Test XSS sanitization with known attack vectors
    - Test CSP compliance validation
    - Test input validation for all data types
    - Test no network requests are made
    - Test no data collection occurs
    - _Requirements: 28.1-28.8, 29.1-29.8, 30.1-30.8_

- [ ] 14. Implement bundle optimization and tree-shaking
  - [ ] 14.1 Configure bundle optimization
    - Use ES modules for all package exports
    - Mark side-effect-free modules in package.json (sideEffects: false)
    - Avoid top-level side effects that prevent tree-shaking
    - Provide granular exports for individual features
    - Use dynamic imports for code splitting where appropriate
    - Lazy-load Canvas rendering code only when Canvas mode is enabled
    - Lazy-load regional adapters only when used
    - _Requirements: 31.5, 31.6, 31.8, 32.1, 32.2, 32.3, 32.4, 32.8_
  
  - [ ] 14.2 Verify bundle size requirements
    - Ensure core library package has gzipped bundle size less than 80 kilobytes
    - Ensure tree-shaken imports (core only) are less than 50 kilobytes gzipped
    - Declare D3 v7 as peer dependency to avoid bundling duplicates
    - Provide separate packages for optional features
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 32.8_
  
  - [ ] 14.3 Create bundle size analysis
    - Provide bundle size analysis report in documentation
    - Document which imports are tree-shakeable
    - Test tree-shaking effectiveness with bundler analysis tools
    - Maintain tree-shaking compatibility across minor versions
    - _Requirements: 31.7, 32.5, 32.6, 32.7_
  
  - [ ]* 14.4 Write tests for bundle optimization
    - **Property 22: Bundle Size Tree-Shaking** - Validates: Requirements 32.8
    - Test bundle size for core-only imports
    - Test tree-shaking effectiveness
    - Test lazy loading of optional features

- [ ] 15. Implement browser compatibility and testing infrastructure
  - [ ] 15.1 Configure browser compatibility
    - Support Chrome version 115 and later
    - Support Firefox version 119 and later
    - Support Safari version 17 and later
    - Support Edge version 115 and later
    - Provide polyfills for features not supported in target browsers
    - Detect unsupported browsers and emit warnings
    - Document browser compatibility in compatibility matrix
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_
  
  - [ ] 15.2 Set up testing infrastructure
    - Configure Vitest as test runner for unit and integration tests
    - Maintain unit test coverage of at least 80% for all packages
    - Provide integration tests for all major features
    - Provide visual regression tests using screenshot comparison
    - Provide performance benchmarks for rendering operations
    - Set up Playwright for automated browser testing
    - Test on all supported browsers (Chrome, Firefox, Safari, Edge)
    - Document testing guidelines for contributors
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.7, 34.8_
  
  - [ ]* 15.3 Write integration tests
    - Test theme system integration with SVG renderer
    - Test i18n system integration with UI controls
    - Test plugin system integration with rendering lifecycle
    - Test context menu integration with event handling
    - Test regional adapters integration with RailGraph parser
    - Test brushing and linking integration with multiple renderer instances
    - Test SSR integration with jsdom and Node.js
    - Test Canvas rendering integration with SVG renderer
    - _Requirements: 34.3_

- [ ] 16. Checkpoint - Ensure optimization and testing infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement package distribution and versioning
  - [ ] 17.1 Configure package distribution
    - Publish all packages to npm under @rail-schematic-viz scope
    - Provide ES modules, CommonJS, and UMD bundle formats
    - Include TypeScript declaration files in all published packages
    - Include source maps in all published packages
    - Specify peer dependencies for D3 v7 and framework dependencies
    - Maintain public npm registry with package metadata
    - _Requirements: 35.1, 35.3, 35.4, 35.5, 35.6, 35.7_
  
  - [ ] 17.2 Implement semantic versioning
    - Follow semantic versioning (MAJOR.MINOR.PATCH)
    - Increment MAJOR version for breaking changes
    - Increment MINOR version for new features
    - Increment PATCH version for bug fixes
    - Maintain changelog documenting all changes
    - Provide migration guides for major version updates
    - Support current and previous major version
    - Deprecate features before removing them in major versions
    - Publish release notes with each version
    - _Requirements: 35.2, 35.8, 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7, 36.8_
  
  - [ ] 17.3 Document package structure
    - Document modular package architecture
    - Describe purpose of each package
    - Document dependencies between packages
    - Document peer dependencies and version requirements
    - Provide guidance on which packages to install
    - Document package size and tree-shaking support
    - Include dependency graph visualization
    - Document release process for packages
    - _Requirements: 46.1, 46.2, 46.3, 46.4, 46.5, 46.6, 46.7, 46.8_

- [ ] 18. Implement TypeScript type definitions and developer experience
  - [ ] 18.1 Configure TypeScript with strict mode
    - Write all code in TypeScript with strict mode enabled
    - Use strict TypeScript compiler options (strictNullChecks, noImplicitAny)
    - Export TypeScript interfaces for all public APIs
    - Provide generic type parameters for custom data types
    - Include JSDoc comments on all public APIs
    - Pass TypeScript compilation with zero errors and warnings
    - Provide type definitions for all configuration objects
    - _Requirements: 47.1, 47.2, 47.3, 47.4, 47.5, 47.6, 47.7_
  
  - [ ] 18.2 Enhance developer experience
    - Provide clear error messages with actionable guidance
    - Provide TypeScript autocompletion in IDEs
    - Provide inline documentation via JSDoc
    - Provide code examples in all documentation
    - Provide CLI tool for common tasks (init, export, validate)
    - Provide debugging utilities for troubleshooting
    - Provide performance monitoring hooks
    - Maintain backward compatibility within major versions
    - _Requirements: 48.1, 48.2, 48.3, 48.4, 48.5, 48.6, 48.7, 48.8_
  
  - [ ]* 18.3 Write tests for TypeScript types
    - Test type definitions compile without errors
    - Test generic type parameters work correctly
    - Test autocompletion in IDE scenarios
    - _Requirements: 47.1, 47.3, 47.6_

- [ ] 19. Create documentation site with VitePress
  - [ ] 19.1 Set up VitePress documentation site
    - Create documentation site built with VitePress
    - Configure deployment to public URL
    - Set up automatic updates with each release
    - Support full-text search across all content
    - Provide responsive design for mobile devices
    - Support dark mode for comfortable reading
    - Include version selector for accessing older docs
    - Provide offline access via service worker
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8_
  
  - [ ] 19.2 Write getting started guide
    - Provide step-by-step instructions for getting started
    - Enable rendering basic schematic in under 10 lines of code
    - Include installation instructions for npm, yarn, and pnpm
    - Include examples for vanilla JavaScript, React, and Vue
    - Include "Hello World" example with minimal configuration
    - Include links to more detailed guides
    - Include troubleshooting tips for common issues
    - Make guide accessible from documentation homepage
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7, 38.8_
  
  - [ ] 19.3 Write API reference documentation
    - Include complete API reference for all public interfaces
    - Document all classes, methods, properties, and types
    - Include parameter types, return types, and descriptions
    - Include code examples for each major API
    - Generate API reference from TypeScript source code and JSDoc comments
    - Include links between related APIs
    - Indicate which APIs are stable vs experimental
    - Document breaking changes and deprecations
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5, 39.6, 39.7, 39.8_
  
  - [ ] 19.4 Create Storybook with interactive examples
    - Set up Storybook component library with live demos
    - Demonstrate all major features with interactive controls
    - Include examples for all layout modes, overlays, and interactions
    - Include examples for all framework adapters
    - Include examples for theming and customization
    - Allow users to modify example code and see results
    - Deploy Storybook to public URL
    - Include links to corresponding documentation pages
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8_

- [ ] 20. Write comprehensive documentation guides
  - [ ] 20.1 Write use case guides
    - Include guides for common use cases
    - Write guide for adding overlays to schematics
    - Write guide for implementing custom interactions
    - Write guide for exporting schematics
    - Write guide for theming and customization
    - Write guide for server-side rendering
    - Write guide for performance optimization
    - Write guide for accessibility compliance
    - _Requirements: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6, 41.7, 41.8_
  
  - [ ] 20.2 Write migration guides
    - Provide migration guides for major version updates
    - Document all breaking changes
    - Provide code examples showing before and after
    - Include automated migration scripts where possible
    - Document deprecated APIs and their replacements
    - Include estimated migration effort and timeline
    - Publish migration guides before major version releases
    - Include links to relevant API documentation
    - _Requirements: 42.1, 42.2, 42.3, 42.4, 42.5, 42.6, 42.7, 42.8_
  
  - [ ] 20.3 Write performance optimization guide
    - Include performance optimization guide
    - Document performance characteristics of different rendering modes
    - Document best practices for large datasets
    - Document viewport culling and level-of-detail strategies
    - Document Canvas vs SVG rendering trade-offs
    - Document bundle size optimization techniques
    - Include performance benchmarks for reference
    - Include profiling and debugging tips
    - _Requirements: 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7, 43.8_
  
  - [ ] 20.4 Write accessibility guide
    - Include accessibility compliance guide
    - Document WCAG 2.1 Level AA compliance features
    - Document keyboard navigation patterns
    - Document screen reader support
    - Document color contrast requirements and themes
    - Document ARIA attributes and roles
    - Include accessibility testing recommendations
    - Include links to WCAG guidelines and resources
    - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6, 44.7, 44.8_
  
  - [ ] 20.5 Write security guide
    - Include security guide
    - Document XSS prevention measures
    - Document Content Security Policy requirements
    - Document data privacy practices
    - Document input validation and sanitization
    - Include security best practices for deployment
    - Include security policy for reporting vulnerabilities
    - Document known security considerations and limitations
    - _Requirements: 45.1, 45.2, 45.3, 45.4, 45.5, 45.6, 45.7, 45.8_

- [ ] 21. Set up continuous integration and deployment
  - [ ] 21.1 Configure CI/CD pipeline
    - Set up GitHub Actions or similar for continuous integration
    - Run all tests on every pull request
    - Run tests on all supported browsers
    - Check code coverage and fail if below 80%
    - Run linting and type checking
    - Build all packages and verify bundle sizes
    - Automatically publish packages to npm on release tags
    - Automatically deploy documentation site on releases
    - _Requirements: 50.1, 50.2, 50.3, 50.4, 50.5, 50.6, 50.7, 50.8_
  
  - [ ]* 21.2 Write CI/CD tests
    - Test CI pipeline configuration
    - Test automated publishing workflow
    - Test documentation deployment
    - _Requirements: 50.1-50.8_

- [ ] 22. Final checkpoint - Run all tests and verify complete ecosystem
  - Run all unit tests and property tests across all packages
  - Verify TypeScript compilation with zero errors
  - Verify test coverage meets 80% minimum for all packages
  - Verify bundle sizes meet requirements (core <80KB, tree-shaken <50KB)
  - Verify browser compatibility on all supported browsers
  - Verify documentation site is complete and accessible
  - Verify all packages are ready for npm publication
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript with strict mode throughout
- Testing uses Vitest and fast-check for property-based testing
- Checkpoints ensure incremental validation at logical breaks
- This is the final package (5 of 5) completing the Rail Schematic Viz library ecosystem
- All sub-packages are independently tree-shakeable for optimal bundle size
- Security features (XSS prevention, CSP compliance) are built-in by default
- Comprehensive documentation and examples accelerate adoption
- CI/CD pipeline ensures reliable releases and consistent quality

