export { RailGraph } from './model';
export { GraphBuilder } from './builder';
export {
  assessBrowserCompatibility,
  detectFeatureSupport,
  detectUnsupportedBrowser,
  getPolyfillRecommendations,
  getSupportedBrowserMatrix,
} from './browser-compatibility';
export {
  createDebugLogger,
  createPerformanceMonitor,
  RailSchematicCLI,
  runCLI,
} from './developer-experience';
export { CoordinateBridge, inverseWebMercator, projectWebMercator } from './coordinates';
export {
  BuildError,
  ERROR_CODES,
  ParseError,
  ProjectionError,
  RailSchematicError,
  ValidationError,
} from './errors';
export { JSONParser, JSONSerializer, RailMLParser } from './parsers';
export { DEFAULT_STYLING, SVGRenderer } from './renderer';
export type {
  Coordinate,
  CurveGeometry,
  EdgeGeometry,
  EdgeId,
  GeographicCoordinate,
  LineId,
  LinearCoordinate,
  NodeId,
  NodeType,
  RailEdge,
  RailGraphInit,
  RailLine,
  RailNode,
  ScreenCoordinate,
  StylingConfiguration,
  StraightGeometry,
  SwitchGeometry,
  SwitchType,
  ValidationResult,
} from './types';
export type {
  BrowserCompatibilityAssessment,
  BrowserEnvironmentLike,
  BrowserFeatureSupport,
  BrowserSupportRule,
  SupportedBrowserName,
} from './browser-compatibility';
export type {
  CLICommandResult,
  CLIIO,
  DebugEvent,
  DebugLogLevel,
  DebugLogger,
  DebugLoggerOptions,
  DebugSink,
  ExportCommandOptions,
  InitCommandOptions,
  PerformanceMonitor,
  PerformanceSample,
  ValidateCommandOptions,
} from './developer-experience';
export { asEdgeId, asLineId, asNodeId, CoordinateSystemType } from './types';
