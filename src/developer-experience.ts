import { GraphBuilder } from './builder';
import { CoordinateSystemType } from './coordinates';
import { JSONParser, JSONSerializer } from './parsers';
import { SVGRenderer } from './renderer';
import type { StylingConfiguration } from './types';

/**
 * Supported log levels for developer-facing debug output.
 */
export type DebugLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A structured debug event emitted by the debug logger.
 */
export interface DebugEvent {
  readonly level: DebugLogLevel;
  readonly message: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

/**
 * Output hook for debug messages.
 */
export interface DebugSink {
  (event: DebugEvent): void;
}

/**
 * Options for the structured debug logger.
 */
export interface DebugLoggerOptions {
  readonly sink?: DebugSink;
  readonly minimumLevel?: DebugLogLevel;
}

/**
 * Developer-facing debug logger with buffered event inspection.
 */
export interface DebugLogger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void;
  info(message: string, context?: Readonly<Record<string, unknown>>): void;
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
  getEvents(): ReadonlyArray<DebugEvent>;
}

/**
 * A performance sample emitted by the performance monitor.
 */
export interface PerformanceSample {
  readonly label: string;
  readonly durationMs: number;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Performance instrumentation hook for rendering and export workflows.
 */
export interface PerformanceMonitor {
  start(label: string, metadata?: Readonly<Record<string, unknown>>): void;
  end(label: string, metadata?: Readonly<Record<string, unknown>>): PerformanceSample;
  getSamples(): ReadonlyArray<PerformanceSample>;
}

/**
 * Output adapter for the lightweight CLI.
 */
export interface CLIIO {
  stdout(message: string): void;
  stderr(message: string): void;
}

/**
 * Result contract shared by CLI command helpers.
 */
export interface CLICommandResult {
  readonly code: 0 | 1;
  readonly ok: boolean;
  readonly output?: string;
  readonly error?: string;
}

/**
 * Options for the `init` CLI command.
 */
export interface InitCommandOptions {
  readonly lineName?: string;
  readonly startStationName?: string;
  readonly endStationName?: string;
}

/**
 * Options for the `export` CLI command.
 */
export interface ExportCommandOptions {
  readonly input: string;
  readonly styling?: Partial<StylingConfiguration>;
}

/**
 * Options for the `validate` CLI command.
 */
export interface ValidateCommandOptions {
  readonly input: string;
}

/**
 * Lightweight CLI for common library workflows such as project bootstrapping, export, and validation.
 */
export class RailSchematicCLI {
  private readonly parser = new JSONParser();
  private readonly renderer = new SVGRenderer();
  private readonly serializer = new JSONSerializer();

  /**
   * Creates a starter rail-graph document that can be used as a minimal project scaffold.
   */
  public init(options: InitCommandOptions = {}): CLICommandResult {
    const graph = new GraphBuilder()
      .addNode({
        id: 'station-start',
        name: options.startStationName ?? 'Origin',
        type: 'station',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 0,
          y: 0,
        },
      })
      .addNode({
        id: 'station-end',
        name: options.endStationName ?? 'Destination',
        type: 'station',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 120,
          y: 0,
        },
      })
      .addEdge({
        id: 'edge-starter',
        source: 'station-start',
        target: 'station-end',
        length: 120,
        geometry: {
          type: 'straight',
        },
      })
      .addLine({
        id: 'starter-line',
        name: options.lineName ?? 'Starter Line',
        edges: ['edge-starter'],
      })
      .build();

    return {
      code: 0,
      ok: true,
      output: this.serializer.serialize(graph),
    };
  }

  /**
   * Converts a JSON rail-graph document into SVG markup.
   */
  public exportSVG(options: ExportCommandOptions): CLICommandResult {
    const parsed = this.parser.parse(options.input);

    if (!parsed.ok) {
      return {
        code: 1,
        error: parsed.error.message,
        ok: false,
      };
    }

    return {
      code: 0,
      ok: true,
      output: this.renderer.render(parsed.value, options.styling),
    };
  }

  /**
   * Validates a JSON rail-graph document and reports a concise diagnostic summary.
   */
  public validate(options: ValidateCommandOptions): CLICommandResult {
    const parsed = this.parser.parse(options.input);

    if (!parsed.ok) {
      return {
        code: 1,
        error: parsed.error.message,
        ok: false,
      };
    }

    const validation = parsed.value.validate();

    if (!validation.valid) {
      return {
        code: 1,
        error: validation.errors.join('; '),
        ok: false,
      };
    }

    return {
      code: 0,
      ok: true,
      output: `Graph is valid. Nodes: ${parsed.value.nodes.size}, Edges: ${parsed.value.edges.size}, Lines: ${parsed.value.lines.size}.`,
    };
  }
}

/**
 * Creates a buffered debug logger for integration troubleshooting and support tooling.
 */
export function createDebugLogger(options: DebugLoggerOptions = {}): DebugLogger {
  const events: DebugEvent[] = [];
  const sink = options.sink;
  const minimumLevel = options.minimumLevel ?? 'debug';

  const logger: DebugLogger = {
    debug: (message, context) => log('debug', message, context),
    error: (message, context) => log('error', message, context),
    getEvents: () => events.map((event) => cloneDebugEvent(event)),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
  };

  function log(
    level: DebugLogLevel,
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ): void {
    if (compareLogLevels(level, minimumLevel) < 0) {
      return;
    }

    const event: DebugEvent = {
      ...(context ? { context: { ...context } } : {}),
      level,
      message,
      timestamp: Date.now(),
    };

    events.push(event);
    sink?.(cloneDebugEvent(event));
  }

  return logger;
}

/**
 * Creates a performance monitor that can be attached to rendering, export, and adapter flows.
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  const activeMarks = new Map<string, { readonly metadata?: Readonly<Record<string, unknown>>; readonly startedAt: number }>();
  const samples: PerformanceSample[] = [];

  return {
    end(label, metadata) {
      const mark = activeMarks.get(label);

      if (!mark) {
        throw new Error(`No active performance mark found for "${label}".`);
      }

      activeMarks.delete(label);

      const endedAt = now();
      const sample: PerformanceSample = {
        durationMs: endedAt - mark.startedAt,
        endedAt,
        label,
        ...(metadata || mark.metadata
          ? { metadata: { ...(mark.metadata ?? {}), ...(metadata ?? {}) } }
          : {}),
        startedAt: mark.startedAt,
      };

      samples.push(sample);

      return clonePerformanceSample(sample);
    },
    getSamples() {
      return samples.map((sample) => clonePerformanceSample(sample));
    },
    start(label, metadata) {
      activeMarks.set(label, {
        ...(metadata ? { metadata: { ...metadata } } : {}),
        startedAt: now(),
      });
    },
  };
}

/**
 * Runs the lightweight CLI with a small command set aimed at project setup, validation, and SVG export.
 */
export async function runCLI(
  argv: ReadonlyArray<string>,
  io: CLIIO = {
    stderr: (message) => {
      console.error(message);
    },
    stdout: (message) => {
      console.log(message);
    },
  },
): Promise<number> {
  const cli = new RailSchematicCLI();
  const command = argv[0] ?? 'help';

  switch (command) {
    case 'help':
    case '--help':
    case '-h': {
      io.stdout(createHelpText());
      return 0;
    }
    case 'init': {
      const result = cli.init({
        ...(argv[1] !== undefined ? { lineName: argv[1] } : {}),
        ...(argv[2] !== undefined ? { startStationName: argv[2] } : {}),
        ...(argv[3] !== undefined ? { endStationName: argv[3] } : {}),
      });

      return writeCLIResult(result, io);
    }
    case 'export': {
      const input = readFlag(argv.slice(1), '--input');
      const result = input
        ? cli.exportSVG({ input })
        : {
            code: 1 as const,
            error: 'Missing required --input argument for export.',
            ok: false,
          };

      return writeCLIResult(result, io);
    }
    case 'validate': {
      const input = readFlag(argv.slice(1), '--input');
      const result = input
        ? cli.validate({ input })
        : {
            code: 1 as const,
            error: 'Missing required --input argument for validate.',
            ok: false,
          };

      return writeCLIResult(result, io);
    }
    default:
      io.stderr(`Unknown command "${command}".`);
      io.stderr(createHelpText());
      return 1;
  }
}

function writeCLIResult(result: CLICommandResult, io: CLIIO): number {
  if (result.ok) {
    io.stdout(result.output ?? '');
  } else {
    io.stderr(result.error ?? 'Unknown error.');
  }

  return result.code;
}

function now(): number {
  return typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();
}

function readFlag(argv: ReadonlyArray<string>, flagName: string): string | undefined {
  const flagIndex = argv.indexOf(flagName);

  if (flagIndex === -1) {
    return undefined;
  }

  return argv[flagIndex + 1];
}

function createHelpText(): string {
  return [
    'rail-schematic-viz CLI',
    '',
    'Commands:',
    '  help',
    '  init [lineName] [startStationName] [endStationName]',
    '  export --input <json>',
    '  validate --input <json>',
  ].join('\n');
}

function compareLogLevels(left: DebugLogLevel, right: DebugLogLevel): number {
  const order: DebugLogLevel[] = ['debug', 'info', 'warn', 'error'];

  return order.indexOf(left) - order.indexOf(right);
}

function cloneDebugEvent(event: DebugEvent): DebugEvent {
  return {
    ...(event.context ? { context: { ...event.context } } : {}),
    level: event.level,
    message: event.message,
    timestamp: event.timestamp,
  };
}

function clonePerformanceSample(sample: PerformanceSample): PerformanceSample {
  return {
    durationMs: sample.durationMs,
    endedAt: sample.endedAt,
    label: sample.label,
    ...(sample.metadata ? { metadata: { ...sample.metadata } } : {}),
    startedAt: sample.startedAt,
  };
}
