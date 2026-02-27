// Re-export shared types
export type {
  SessionSummary,
  ProjectGroup,
  ContentBlock,
  ParsedMessage,
  SessionDetail,
  CronTask,
  CronExecution,
  TodoItem,
  TodoProviderOrigin,
  TodoProviderConfig,
  ProviderSyncResult,
  ProviderConfigField,
  ProviderTypeInfo,
} from '@shared/types.js';

// Client-only types

export interface WsOutMessage {
  type: 'resume' | 'message' | 'stop';
  sessionId?: string;
  projectPath?: string;
  content?: string;
}

export interface WsInMessage {
  type: 'connected' | 'assistant_text' | 'assistant_thinking' | 'tool_use' | 'tool_input_delta' | 'result' | 'done' | 'error';
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  message?: string;
  sessionId?: string;
  result?: unknown;
}
