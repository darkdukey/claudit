import { TodoProviderConfig, ProviderSyncResult, TodoItem } from '../types.js';
import { getProvider } from './providers/registry.js';
import { getAllConfigs, getConfig, updateConfig } from './providerConfigStorage.js';
import { getAllTodos, createTodo, updateTodo } from './todoStorage.js';

/**
 * Sync a single provider config: fetch external items and upsert into local todos.
 */
export async function syncProvider(config: TodoProviderConfig): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    configId: config.id,
    imported: 0,
    updated: 0,
    errors: [],
  };

  const provider = getProvider(config.providerId);
  if (!provider) {
    result.errors.push(`Provider "${config.providerId}" not found`);
    updateConfig(config.id, { lastSyncError: result.errors[0] });
    return result;
  }

  try {
    const externalItems = await provider.fetchItems(config.config);
    const localTodos = getAllTodos();

    // Index existing provider-linked todos by externalId for this config
    const localByExternalId = new Map<string, TodoItem>();
    for (const todo of localTodos) {
      if (todo.provider?.configId === config.id && todo.provider.externalId) {
        localByExternalId.set(todo.provider.externalId, todo);
      }
    }

    for (const ext of externalItems) {
      try {
        const existing = localByExternalId.get(ext.externalId);
        if (existing) {
          // Update if changed
          const needsUpdate =
            existing.title !== ext.title ||
            existing.description !== ext.description ||
            existing.completed !== ext.completed ||
            existing.priority !== ext.priority;

          if (needsUpdate && existing.provider?.syncStatus !== 'local_modified') {
            updateTodo(existing.id, {
              title: ext.title,
              description: ext.description,
              completed: ext.completed,
              completedAt: ext.completed && !existing.completedAt
                ? new Date().toISOString()
                : existing.completedAt,
              priority: ext.priority,
              provider: {
                ...existing.provider!,
                lastSyncedAt: new Date().toISOString(),
                syncStatus: 'synced',
                syncError: undefined,
              },
            });
            result.updated++;
          }
        } else {
          // Create new
          createTodo({
            title: ext.title,
            description: ext.description,
            completed: ext.completed,
            completedAt: ext.completed ? new Date().toISOString() : undefined,
            priority: ext.priority,
            provider: {
              providerId: config.providerId,
              configId: config.id,
              externalId: ext.externalId,
              externalUrl: ext.externalUrl,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'synced',
            },
          });
          result.imported++;
        }
      } catch (err: any) {
        result.errors.push(`Item ${ext.externalId}: ${err.message}`);
      }
    }

    updateConfig(config.id, {
      lastSyncAt: new Date().toISOString(),
      lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    });
  } catch (err: any) {
    const errMsg = `Sync failed: ${err.message}`;
    result.errors.push(errMsg);
    updateConfig(config.id, { lastSyncError: errMsg });
  }

  return result;
}

/**
 * When a provider-linked todo is completed locally, push completion to external system.
 */
export async function pushCompletion(todo: TodoItem): Promise<void> {
  if (!todo.provider) return;

  const config = getConfig(todo.provider.configId);
  if (!config) return;

  const provider = getProvider(todo.provider.providerId);
  if (!provider?.completeItem) return;

  try {
    await provider.completeItem(config.config, todo.provider.externalId);
    updateTodo(todo.id, {
      provider: {
        ...todo.provider,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
      },
    });
  } catch (err: any) {
    updateTodo(todo.id, {
      provider: {
        ...todo.provider,
        syncStatus: 'sync_error',
        syncError: err.message,
      },
    });
  }
}

/**
 * Sync all enabled provider configs.
 */
export async function syncAllProviders(): Promise<ProviderSyncResult[]> {
  const configs = getAllConfigs().filter(c => c.enabled);
  const results: ProviderSyncResult[] = [];
  for (const config of configs) {
    const result = await syncProvider(config);
    results.push(result);
  }
  return results;
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize periodic sync. Checks every 60s if any config needs syncing.
 */
export function initProviderSync() {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    const configs = getAllConfigs().filter(c => c.enabled && c.syncIntervalMinutes && c.syncIntervalMinutes > 0);

    for (const config of configs) {
      const intervalMs = config.syncIntervalMinutes! * 60 * 1000;
      const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt).getTime() : 0;
      if (Date.now() - lastSync >= intervalMs) {
        try {
          await syncProvider(config);
        } catch (err) {
          console.error(`Auto-sync failed for config "${config.name}":`, err);
        }
      }
    }
  }, 60_000);
}

/**
 * Stop periodic sync.
 */
export function stopProviderSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
