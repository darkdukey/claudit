import { TodoGroup } from '../types';

export async function fetchGroups(): Promise<TodoGroup[]> {
  const res = await fetch('/api/todo/groups');
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

export async function createGroup(name: string): Promise<TodoGroup> {
  const res = await fetch('/api/todo/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create group');
  return res.json();
}

export async function updateGroup(id: string, data: { name?: string; position?: number }): Promise<TodoGroup> {
  const res = await fetch(`/api/todo/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update group');
  return res.json();
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await fetch(`/api/todo/groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete group');
}
