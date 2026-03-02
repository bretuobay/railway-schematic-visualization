import type { EdgeId, LineId } from '../coordinates/types';

export interface RailLine {
  readonly id: LineId;
  readonly name: string;
  readonly edges: ReadonlyArray<EdgeId>;
  readonly color?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
