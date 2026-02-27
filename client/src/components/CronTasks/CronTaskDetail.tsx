import { useState, useEffect, useCallback } from 'react';
import { CronTask, CronExecution } from '../../types';
import {
  fetchCronTasks,
  updateCronTask,
  deleteCronTask,
  runCronTask,
  fetchCronExecutions,
} from '../../api/cron';
import CronTaskForm from './CronTaskForm';

interface Props {
  taskId: string | null;
  onTaskDeleted: () => void;
}

export default function CronTaskDetail({ taskId, onTaskDeleted }: Props) {
  const [task, setTask] = useState<CronTask | null>(null);
  const [executions, setExecutions] = useState<CronExecution[]>([]);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setExecutions([]);
      return;
    }
    try {
      const tasks = await fetchCronTasks();
      const found = tasks.find(t => t.id === taskId);
      setTask(found ?? null);
      const execs = await fetchCronExecutions(taskId);
      setExecutions(execs);
    } catch (err) {
      console.error('Failed to load task detail:', err);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    const interval = setInterval(loadTask, 5000);
    return () => clearInterval(interval);
  }, [loadTask]);

  if (!taskId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-gray-600">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-lg">Select a cron task to view</p>
          <p className="text-sm mt-1">Or create a new one from the left panel</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  const handleToggle = async () => {
    try {
      const updated = await updateCronTask(task.id, { enabled: !task.enabled });
      setTask(updated);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task.name}"?`)) return;
    try {
      await deleteCronTask(task.id);
      onTaskDeleted();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await runCronTask(task.id);
      setTimeout(loadTask, 1000);
    } catch (err) {
      console.error('Failed to run task:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    cronExpression: string;
    prompt: string;
    projectPath?: string;
    enabled: boolean;
  }) => {
    try {
      const updated = await updateCronTask(task.id, data);
      setTask(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (editing) {
    return (
      <div className="p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Edit Task</h2>
        <CronTaskForm
          initial={task}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">{task.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                task.enabled
                  ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {task.enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {running ? 'Starting...' : 'Run Now'}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-3 py-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Schedule:</span>{' '}
            <span className="text-gray-300 font-mono">{task.cronExpression}</span>
          </div>
          {task.projectPath && (
            <div>
              <span className="text-gray-500">Project:</span>{' '}
              <span className="text-gray-300">{task.projectPath}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Last run:</span>{' '}
            <span className="text-gray-300">
              {task.lastRun ? new Date(task.lastRun).toLocaleString() : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="text-gray-300">
              {new Date(task.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-gray-500 text-sm">Prompt:</span>
          <pre className="mt-1 text-sm text-gray-300 bg-gray-800 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {task.prompt}
          </pre>
        </div>
      </div>

      {/* Execution History */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Execution History ({executions.length})
        </h3>
        {executions.length === 0 ? (
          <div className="text-gray-600 text-sm">No executions yet.</div>
        ) : (
          <div className="space-y-3">
            {executions.map(exec => (
              <ExecutionCard key={exec.id} execution={exec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionCard({ execution }: { execution: CronExecution }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    running: 'text-yellow-400 bg-yellow-900/30',
    success: 'text-green-400 bg-green-900/30',
    error: 'text-red-400 bg-red-900/30',
  };

  const duration = execution.finishedAt
    ? Math.round(
        (new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000
      )
    : null;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded ${statusColors[execution.status]}`}>
            {execution.status}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(execution.startedAt).toLocaleString()}
          </span>
          {duration !== null && (
            <span className="text-xs text-gray-600">{duration}s</span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-800">
          {execution.output && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Output:</div>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded p-2 max-h-60 overflow-auto whitespace-pre-wrap">
                {execution.output}
              </pre>
            </div>
          )}
          {execution.error && (
            <div className="mt-2">
              <div className="text-xs text-red-400 mb-1">Error:</div>
              <pre className="text-xs text-red-300 bg-red-900/20 rounded p-2 max-h-60 overflow-auto whitespace-pre-wrap">
                {execution.error}
              </pre>
            </div>
          )}
          {!execution.output && !execution.error && (
            <div className="mt-2 text-xs text-gray-600">
              {execution.status === 'running' ? 'Task is still running...' : 'No output.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
