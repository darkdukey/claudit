import path from 'path';
import crypto from 'crypto';
import { TodoProviderConfig } from '../types.js';
import { JsonStore } from './jsonStore.js';

const CLAUDE_DIR = path.join(process.env.HOME || '~', '.claude');
const CONFIG_FILE = path.join(CLAUDE_DIR, 'claudit-todo-providers.json');

const configStore = new JsonStore<TodoProviderConfig[]>(CONFIG_FILE, []);

export function getAllConfigs(): TodoProviderConfig[] {
  return configStore.read();
}

export function getConfig(id: string): TodoProviderConfig | undefined {
  return getAllConfigs().find(c => c.id === id);
}

/** Trim whitespace from all string values in config (prevents pasted keys with spaces) */
function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    result[key] = typeof value === 'string' ? value.replace(/\s+/g, '') : value;
  }
  return result;
}

export function createConfig(data: Omit<TodoProviderConfig, 'id' | 'createdAt'>): TodoProviderConfig {
  const config: TodoProviderConfig = {
    ...data,
    config: sanitizeConfig(data.config),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  configStore.update(configs => { configs.push(config); });
  return config;
}

export function updateConfig(id: string, updates: Partial<TodoProviderConfig>): TodoProviderConfig | null {
  let result: TodoProviderConfig | null = null;
  configStore.update(configs => {
    const idx = configs.findIndex(c => c.id === id);
    if (idx !== -1) {
      const sanitized = updates.config ? { ...updates, config: sanitizeConfig(updates.config) } : updates;
      configs[idx] = { ...configs[idx], ...sanitized, id };
      result = configs[idx];
    }
  });
  return result;
}

export function deleteConfig(id: string): boolean {
  let deleted = false;
  configStore.update(configs => {
    const len = configs.length;
    const filtered = configs.filter(c => c.id !== id);
    deleted = filtered.length < len;
    configs.length = 0;
    configs.push(...filtered);
  });
  return deleted;
}
