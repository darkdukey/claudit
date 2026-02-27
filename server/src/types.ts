// Re-export shared types
export type {
  SessionSummary,
  ProjectGroup,
  ContentBlock,
  ParsedMessage,
  SessionDetail,
  CronTask,
  CronExecution,
  TodoGroup,
  TodoItem,
  TodoProviderOrigin,
  TodoProviderConfig,
  ProviderSyncResult,
  ProviderConfigField,
  ExternalTodoItem,
  ProviderTypeInfo,
} from '../../shared/src/types.js';

// Server-only types

export interface HistoryEntry {
  display: string;
  pastedContents: Record<string, unknown>;
  timestamp: number;
  project: string;
  sessionId: string;
}
