import { Router } from 'express';
import {
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTaskExecutions,
} from '../services/cronStorage.js';
import { refreshTask, removeTask, runTaskNow } from '../services/cronScheduler.js';

const router = Router();

// GET /api/cron — list all tasks
router.get('/', (_req, res) => {
  try {
    res.json(getAllTasks());
  } catch (err) {
    console.error('Error fetching cron tasks:', err);
    res.status(500).json({ error: 'Failed to fetch cron tasks' });
  }
});

// POST /api/cron — create task
router.post('/', (req, res) => {
  try {
    const { name, cronExpression, prompt, enabled, projectPath } = req.body;
    if (!name || !cronExpression || !prompt) {
      res.status(400).json({ error: 'name, cronExpression, and prompt are required' });
      return;
    }
    const task = createTask({
      name,
      cronExpression,
      prompt,
      enabled: enabled ?? true,
      projectPath,
    });
    refreshTask(task.id);
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating cron task:', err);
    res.status(500).json({ error: 'Failed to create cron task' });
  }
});

// PUT /api/cron/:id — update task
router.put('/:id', (req, res) => {
  try {
    const task = updateTask(req.params.id, req.body);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    refreshTask(task.id);
    res.json(task);
  } catch (err) {
    console.error('Error updating cron task:', err);
    res.status(500).json({ error: 'Failed to update cron task' });
  }
});

// DELETE /api/cron/:id — delete task
router.delete('/:id', (req, res) => {
  try {
    const ok = deleteTask(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    removeTask(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting cron task:', err);
    res.status(500).json({ error: 'Failed to delete cron task' });
  }
});

// POST /api/cron/:id/run — manual trigger
router.post('/:id/run', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    runTaskNow(task.id);
    res.json({ success: true, message: 'Task triggered' });
  } catch (err) {
    console.error('Error running cron task:', err);
    res.status(500).json({ error: 'Failed to run cron task' });
  }
});

// GET /api/cron/:id/executions — execution history
router.get('/:id/executions', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(getTaskExecutions(task.id));
  } catch (err) {
    console.error('Error fetching executions:', err);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

export default router;
