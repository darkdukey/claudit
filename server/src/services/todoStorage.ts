import path from 'path';
import crypto from 'crypto';
import { TodoItem } from '../types.js';
import { JsonStore } from './jsonStore.js';

const CLAUDE_DIR = path.join(process.env.HOME || '~', '.claude');
const TODOS_FILE = path.join(CLAUDE_DIR, 'claudit-todos.json');

const todosStore = new JsonStore<TodoItem[]>(TODOS_FILE, []);

export function getAllTodos(): TodoItem[] {
  return todosStore.read();
}

export function getTodo(id: string): TodoItem | undefined {
  return getAllTodos().find(t => t.id === id);
}

export function createTodo(data: Omit<TodoItem, 'id' | 'createdAt'>): TodoItem {
  const todo: TodoItem = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  todosStore.update(todos => { todos.push(todo); });
  return todo;
}

export function updateTodo(id: string, updates: Partial<TodoItem>): TodoItem | null {
  let result: TodoItem | null = null;
  todosStore.update(todos => {
    const idx = todos.findIndex(t => t.id === id);
    if (idx !== -1) {
      todos[idx] = { ...todos[idx], ...updates, id };
      result = todos[idx];
    }
  });
  return result;
}

export function deleteTodo(id: string): boolean {
  let deleted = false;
  todosStore.update(todos => {
    const len = todos.length;
    const filtered = todos.filter(t => t.id !== id);
    deleted = filtered.length < len;
    todos.length = 0;
    todos.push(...filtered);
  });
  return deleted;
}
