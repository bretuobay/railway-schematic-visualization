import { describe, expect, it, vi } from 'vitest';

import {
  createDebugLogger,
  createPerformanceMonitor,
  RailSchematicCLI,
  runCLI,
} from './developer-experience';

describe('developer experience helpers', () => {
  it('creates a starter project document with the CLI init helper', () => {
    const result = new RailSchematicCLI().init({
      endStationName: 'Beta',
      lineName: 'Demo Line',
      startStationName: 'Alpha',
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain('"name": "Demo Line"');
    expect(result.output).toContain('"name": "Alpha"');
    expect(result.output).toContain('"name": "Beta"');
  });

  it('exports valid svg from a json graph document', () => {
    const cli = new RailSchematicCLI();
    const initResult = cli.init();
    const exportResult = cli.exportSVG({
      input: initResult.output ?? '',
    });

    expect(exportResult.ok).toBe(true);
    expect(exportResult.output?.startsWith('<svg')).toBe(true);
  });

  it('returns validation errors for invalid json input', () => {
    const result = new RailSchematicCLI().validate({
      input: '{',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Input is not valid JSON.');
  });

  it('buffers debug events above the configured minimum level', () => {
    const sink = vi.fn();
    const logger = createDebugLogger({
      minimumLevel: 'info',
      sink,
    });

    logger.debug('hidden');
    logger.info('visible', { area: 'export' });
    logger.error('failure');

    expect(logger.getEvents()).toHaveLength(2);
    expect(logger.getEvents()[0]?.message).toBe('visible');
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('captures performance samples', () => {
    const monitor = createPerformanceMonitor();

    monitor.start('render', { surface: 'svg' });
    const sample = monitor.end('render', { status: 'ok' });

    expect(sample.label).toBe('render');
    expect(sample.durationMs).toBeGreaterThanOrEqual(0);
    expect(sample.metadata).toEqual({
      surface: 'svg',
      status: 'ok',
    });
    expect(monitor.getSamples()).toHaveLength(1);
  });

  it('runs the help and validate commands through the CLI parser', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    const helpCode = await runCLI(['help'], { stderr, stdout });
    const validateCode = await runCLI(['validate', '--input', '{'], { stderr, stdout });

    expect(helpCode).toBe(0);
    expect(validateCode).toBe(1);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('rail-schematic-viz CLI'));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Input is not valid JSON.'));
  });
});
