import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
  const { username, password, is_admin = false } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existing = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin, created_at',
      [username, hash, !!is_admin]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, is_admin } = req.body;
  if (!username && !password && typeof is_admin === 'undefined') {
    return res.status(400).json({ error: 'No changes provided' });
  }

  try {
    const current = await pool.query('SELECT id, username, is_admin FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const duplicate = await pool.query('SELECT 1 FROM users WHERE username = $1 AND id <> $2', [username, id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (username) {
      updates.push(`username = $${idx++}`);
      params.push(username);
    }
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      updates.push(`password_hash = $${idx++}`);
      params.push(hash);
    }
    if (typeof is_admin !== 'undefined') {
      updates.push(`is_admin = $${idx++}`);
      params.push(!!is_admin);
    }

    params.push(id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);

    const { rows } = await pool.query('SELECT id, username, is_admin, created_at FROM users WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
