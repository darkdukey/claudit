import { TodoProviderConfig, ProviderSyncResult, ProviderTypeInfo } from '../types';

export async function fetchProviderTypes(): Promise<ProviderTypeInfo[]> {
  const res = await fetch('/api/todo/providers');
  if (!res.ok) throw new Error('Failed to fetch provider types');
  return res.json();
}

export async function fetchProviderConfigs(): Promise<TodoProviderConfig[]> {
  const res = await fetch('/api/todo/providers/configs');
  if (!res.ok) throw new Error('Failed to fetch provider configs');
  return res.json();
}

export async function createProviderConfig(data: {
  providerId: string;
  name: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  syncIntervalMinutes?: number;
}): Promise<TodoProviderConfig> {
  const res = await fetch('/api/todo/providers/configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create provider config');
  }
  return res.json();
}

export async function updateProviderConfig(
  id: string,
  data: Partial<TodoProviderConfig>
): Promise<TodoProviderConfig> {
  const res = await fetch(`/api/todo/providers/configs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update provider config');
  }
  return res.json();
}

export async function deleteProviderConfig(id: string): Promise<void> {
  const res = await fetch(`/api/todo/providers/configs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete provider config');
}

export async function syncProvider(configId: string): Promise<ProviderSyncResult> {
  const res = await fetch(`/api/todo/providers/configs/${encodeURIComponent(configId)}/sync`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to sync provider');
  return res.json();
}

export async function syncAllProviders(): Promise<ProviderSyncResult[]> {
  const res = await fetch('/api/todo/providers/sync-all', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to sync providers');
  return res.json();
}
