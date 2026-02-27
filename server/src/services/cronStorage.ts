import path from 'path';
import crypto from 'crypto';
import { CronTask, CronExecution } from '../types.js';
import { JsonStore } from './jsonStore.js';

const CLAUDE_DIR = path.join(process.env.HOME || '~', '.claude');
const TASKS_FILE = path.join(CLAUDE_DIR, 'cron-tasks.json');
const EXECUTIONS_FILE = path.join(CLAUDE_DIR, 'cron-executions.json');
const MAX_EXECUTIONS_PER_TASK = 100;

const tasksStore = new JsonStore<CronTask[]>(TASKS_FILE, []);
const execsStore = new JsonStore<CronExecution[]>(EXECUTIONS_FILE, []);

// --- Tasks ---

export function getAllTasks(): CronTask[] {
  return tasksStore.read();
}

export function getTask(id: string): CronTask | undefined {
  return getAllTasks().find(t => t.id === id);
}

export function createTask(data: Omit<CronTask, 'id' | 'createdAt'>): CronTask {
  const task: CronTask = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  tasksStore.update(tasks => { tasks.push(task); });
  return task;
}

export function updateTask(id: string, updates: Partial<CronTask>): CronTask | null {
  let result: CronTask | null = null;
  tasksStore.update(tasks => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates, id };
      result = tasks[idx];
    }
  });
  return result;
}

export function deleteTask(id: string): boolean {
  let deleted = false;
  tasksStore.update(tasks => {
    const len = tasks.length;
    const filtered = tasks.filter(t => t.id !== id);
    deleted = filtered.length < len;
    tasks.length = 0;
    tasks.push(...filtered);
  });
  if (deleted) {
    execsStore.update(execs => {
      const filtered = execs.filter(e => e.taskId !== id);
      execs.length = 0;
      execs.push(...filtered);
    });
  }
  return deleted;
}

// --- Executions ---

export function getTaskExecutions(taskId: string): CronExecution[] {
  return execsStore.read()
    .filter(e => e.taskId === taskId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function createExecution(taskId: string): CronExecution {
  const exec: CronExecution = {
    id: crypto.randomUUID(),
    taskId,
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  execsStore.update(execs => {
    execs.push(exec);
    // Trim old executions per task
    const taskExecs = execs.filter(e => e.taskId === taskId);
    if (taskExecs.length > MAX_EXECUTIONS_PER_TASK) {
      const toRemoveIds = new Set(
        taskExecs
          .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
          .slice(0, taskExecs.length - MAX_EXECUTIONS_PER_TASK)
          .map(e => e.id)
      );
      const trimmed = execs.filter(e => !toRemoveIds.has(e.id));
      execs.length = 0;
      execs.push(...trimmed);
    }
  });
  return exec;
}

export function updateExecution(id: string, updates: Partial<CronExecution>): CronExecution | null {
  let result: CronExecution | null = null;
  execsStore.update(execs => {
    const idx = execs.findIndex(e => e.id === id);
    if (idx !== -1) {
      execs[idx] = { ...execs[idx], ...updates, id };
      result = execs[idx];
    }
  });
  return result;
}
