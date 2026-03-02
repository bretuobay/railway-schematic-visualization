import type {
  ARIAElementLike,
} from './ARIAManager';
import type { FocusableElementLike } from './FocusManager';

export class MockAccessibleElement implements ARIAElementLike, FocusableElementLike {
  public readonly style: Record<string, string> = {};
  private readonly attributes = new Map<string, string>();

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
}
