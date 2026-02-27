import cron, { ScheduledTask } from 'node-cron';
import { spawn } from 'child_process';
import {
  getAllTasks,
  getTask,
  updateTask,
  createExecution,
  updateExecution,
} from './cronStorage.js';
import { getAllTodos } from './todoStorage.js';

const scheduledJobs = new Map<string, ScheduledTask>();

const PRIORITY_ICON: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

function formatTodosForPrompt(): string {
  const todos = getAllTodos().filter(t => !t.completed);
  if (todos.length === 0) return '(No pending todos)';
  return todos.map((t, i) => {
    const icon = PRIORITY_ICON[t.priority] || '⚪';
    let line = `${i + 1}. ${icon} [${t.priority}] ${t.title}`;
    if (t.description) line += `\n   ${t.description}`;
    if (t.provider?.externalUrl) line += `\n   Link: ${t.provider.externalUrl}`;
    return line;
  }).join('\n');
}

function resolvePrompt(prompt: string): string {
  if (!prompt.includes('{{todos}}')) return prompt;
  return prompt.replace(/\{\{todos\}\}/g, formatTodosForPrompt());
}

function executeTask(taskId: string) {
  const task = getTask(taskId);
  if (!task) return;

  console.log(`[cron] Executing task: ${task.name} (${taskId})`);

  const exec = createExecution(taskId);

  const args = ['-p', '--output-format', 'text', '--dangerously-skip-permissions'];

  const child = spawn('claude', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: task.projectPath || undefined,
    env: { ...process.env },
  });

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });

  child.stderr.on('data', (data: Buffer) => {
    errorOutput += data.toString();
  });

  // Resolve template variables and write prompt to stdin
  const resolvedPrompt = resolvePrompt(task.prompt);
  child.stdin.write(resolvedPrompt);
  child.stdin.end();

  child.on('close', (code) => {
    const finishedAt = new Date().toISOString();
    const status = code === 0 ? 'success' as const : 'error' as const;
    updateExecution(exec.id, {
      finishedAt,
      status,
      output: output || undefined,
      error: code !== 0 ? (errorOutput || `Exit code: ${code}`) : undefined,
    });
    updateTask(taskId, { lastRun: finishedAt });
    console.log(`[cron] Task ${task.name} finished with status: ${status}`);
  });

  child.on('error', (err) => {
    updateExecution(exec.id, {
      finishedAt: new Date().toISOString(),
      status: 'error',
      error: err.message,
    });
    console.error(`[cron] Task ${task.name} spawn error:`, err.message);
  });
}

function scheduleTask(taskId: string, cronExpression: string) {
  // Remove existing schedule if any
  unscheduleTask(taskId);

  if (!cron.validate(cronExpression)) {
    console.error(`[cron] Invalid cron expression for task ${taskId}: ${cronExpression}`);
    return;
  }

  const job = cron.schedule(cronExpression, () => {
    executeTask(taskId);
  });

  scheduledJobs.set(taskId, job);
  console.log(`[cron] Scheduled task ${taskId}: ${cronExpression}`);
}

function unscheduleTask(taskId: string) {
  const existing = scheduledJobs.get(taskId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(taskId);
  }
}

export function initScheduler() {
  console.log('[cron] Initializing scheduler...');
  const tasks = getAllTasks();
  for (const task of tasks) {
    if (task.enabled) {
      scheduleTask(task.id, task.cronExpression);
    }
  }
  console.log(`[cron] Loaded ${tasks.filter(t => t.enabled).length} active tasks`);
}

export function refreshTask(taskId: string) {
  const task = getTask(taskId);
  if (!task || !task.enabled) {
    unscheduleTask(taskId);
  } else {
    scheduleTask(taskId, task.cronExpression);
  }
}

export function removeTask(taskId: string) {
  unscheduleTask(taskId);
}

export function runTaskNow(taskId: string) {
  executeTask(taskId);
}

export function stopAllJobs() {
  for (const [id, job] of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.clear();
}
