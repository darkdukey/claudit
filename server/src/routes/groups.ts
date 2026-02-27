import { Router } from 'express';
import {
  getAllGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../services/groupStorage.js';

const router = Router();

// GET /api/todo/groups — list all groups
router.get('/', (_req, res) => {
  try {
    res.json(getAllGroups());
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/todo/groups — create group
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const group = createGroup(name);
    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/todo/groups/:id — update group
router.put('/:id', (req, res) => {
  try {
    const group = updateGroup(req.params.id, req.body);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    res.json(group);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/todo/groups/:id — delete group
router.delete('/:id', (req, res) => {
  try {
    const ok = deleteGroup(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
