import { ExternalTodoItem, ProviderConfigField } from '../../types.js';

export interface TodoProvider {
  readonly id: string;
  readonly displayName: string;
  readonly configSchema: ProviderConfigField[];
  fetchItems(config: Record<string, unknown>): Promise<ExternalTodoItem[]>;
  completeItem?(config: Record<string, unknown>, externalId: string): Promise<void>;
  validateConfig?(config: Record<string, unknown>): Promise<string | null>;
}
