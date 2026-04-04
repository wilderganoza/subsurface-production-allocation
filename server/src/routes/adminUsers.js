import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, is_admin, created_at FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  return res.status(403).json({ error: 'Single-user mode enabled. Creating users is disabled.' });
});

router.put('/:id', async (req, res) => {
  return res.status(403).json({ error: 'Single-user mode enabled. Updating users is disabled.' });
});

router.delete('/:id', async (req, res) => {
  return res.status(403).json({ error: 'Single-user mode enabled. Deleting users is disabled.' });
});

export default router;
