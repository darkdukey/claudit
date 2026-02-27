import crypto from 'crypto';
import { TodoGroup } from '../types.js';
import { db } from './database.js';

const stmtAll = db.prepare('SELECT * FROM todo_groups ORDER BY position ASC, createdAt ASC');
const stmtById = db.prepare('SELECT * FROM todo_groups WHERE id = ?');
const stmtInsert = db.prepare(`
  INSERT INTO todo_groups (id, name, position, createdAt)
  VALUES (@id, @name, @position, @createdAt)
`);
const stmtUpdate = db.prepare('UPDATE todo_groups SET name = ?, position = ? WHERE id = ?');
const stmtDelete = db.prepare('DELETE FROM todo_groups WHERE id = ?');
const stmtMaxPosition = db.prepare('SELECT COALESCE(MAX(position), 0) as maxPos FROM todo_groups');

function rowToGroup(row: any): TodoGroup {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt,
  };
}

export function getAllGroups(): TodoGroup[] {
  return stmtAll.all().map(rowToGroup);
}

export function getGroup(id: string): TodoGroup | undefined {
  const row = stmtById.get(id);
  return row ? rowToGroup(row) : undefined;
}

export function createGroup(name: string): TodoGroup {
  const maxPos = (stmtMaxPosition.get() as any)?.maxPos ?? 0;
  const group: TodoGroup = {
    id: crypto.randomUUID(),
    name,
    position: maxPos + 1000,
    createdAt: new Date().toISOString(),
  };
  stmtInsert.run(group);
  return group;
}

export function updateGroup(id: string, updates: { name?: string; position?: number }): TodoGroup | null {
  const existing = getGroup(id);
  if (!existing) return null;
  const merged = {
    ...existing,
    ...updates,
  };
  stmtUpdate.run(merged.name, merged.position, id);
  return merged;
}

export function deleteGroup(id: string): boolean {
  const result = stmtDelete.run(id);
  return result.changes > 0;
}
