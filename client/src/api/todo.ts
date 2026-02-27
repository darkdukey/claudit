import { TodoItem } from '../types';

export async function fetchTodos(): Promise<TodoItem[]> {
  const res = await fetch('/api/todo');
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
}

export async function createTodo(data: {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  sessionId?: string;
  sessionLabel?: string;
}): Promise<TodoItem> {
  const res = await fetch('/api/todo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create todo');
  return res.json();
}

export async function updateTodo(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
  const res = await fetch(`/api/todo/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update todo');
  return res.json();
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todo/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete todo');
}
