import { CronTask, CronExecution } from '../types';

export async function fetchCronTasks(): Promise<CronTask[]> {
  const res = await fetch('/api/cron');
  if (!res.ok) throw new Error('Failed to fetch cron tasks');
  return res.json();
}

export async function createCronTask(data: {
  name: string;
  cronExpression: string;
  prompt: string;
  enabled?: boolean;
  projectPath?: string;
}): Promise<CronTask> {
  const res = await fetch('/api/cron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create cron task');
  return res.json();
}

export async function updateCronTask(id: string, data: Partial<CronTask>): Promise<CronTask> {
  const res = await fetch(`/api/cron/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update cron task');
  return res.json();
}

export async function deleteCronTask(id: string): Promise<void> {
  const res = await fetch(`/api/cron/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete cron task');
}

export async function runCronTask(id: string): Promise<void> {
  const res = await fetch(`/api/cron/${encodeURIComponent(id)}/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run cron task');
}

export async function fetchCronExecutions(taskId: string): Promise<CronExecution[]> {
  const res = await fetch(`/api/cron/${encodeURIComponent(taskId)}/executions`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}
