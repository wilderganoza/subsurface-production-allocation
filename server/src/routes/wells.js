import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET all wells for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { rows: wells } = await pool.query(
      `SELECT w.*,
        (SELECT COUNT(*) FROM production_data WHERE well_id = w.id) as production_count,
        (SELECT COUNT(*) FROM sand_properties WHERE well_id = w.id) as sand_count,
        (SELECT COUNT(*) FROM intervention_dates WHERE well_id = w.id) as intervention_count,
        (SELECT COUNT(*) FROM allocation_results WHERE well_id = w.id) as has_results,
        (SELECT MIN(date)::text FROM production_data WHERE well_id = w.id) as first_production_date,
        (SELECT MAX(date)::text FROM production_data WHERE well_id = w.id) as last_production_date,
        (SELECT MAX(created_at)::text FROM allocation_results WHERE well_id = w.id) as allocation_date
       FROM wells w WHERE w.user_id = $1 ORDER BY w.created_at`,
      [req.user.id]
    );
    res.json(wells);
  } catch (err) {
    console.error('Get wells error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create well
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Well name required' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO wells (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name.trim()]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Create well error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT rename well
router.put('/:id', async (req, res) => {
  const { name, decline_model } = req.body;
  try {
    const updates = [];
    const values = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (decline_model) { updates.push(`decline_model = $${idx++}`); values.push(decline_model); }
    updates.push(`updated_at = NOW()`);

    values.push(req.params.id, req.user.id);
    const { rows } = await pool.query(
      `UPDATE wells SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Well not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update well error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE well
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM wells WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Well not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete well error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PRODUCTION DATA ============

// GET production data for a well
router.get('/:id/production', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT date::text, total_production as "totalProduction"
       FROM production_data WHERE well_id = $1 ORDER BY date`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get production error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST bulk save production data (replace all)
router.post('/:id/production', async (req, res) => {
  const { data } = req.body; // [{ date, totalProduction }]
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Data array required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM production_data WHERE well_id = $1', [req.params.id]);

    if (data.length > 0) {
      const values = data.map((r, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(',');
      const params = [req.params.id];
      data.forEach(r => { params.push(r.date, r.totalProduction); });
      await client.query(`INSERT INTO production_data (well_id, date, total_production) VALUES ${values}`, params);
    }

    // Clear results when data changes
    await client.query('DELETE FROM allocation_results WHERE well_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, count: data.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save production error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ============ SAND PROPERTIES ============

// GET sand properties
router.get('/:id/sands', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sand_name as "sandName", kh FROM sand_properties WHERE well_id = $1 ORDER BY id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get sands error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST bulk save sand properties (replace all)
router.post('/:id/sands', async (req, res) => {
  const { data } = req.body; // [{ sandName, kh }]
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Data array required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sand_properties WHERE well_id = $1', [req.params.id]);

    if (data.length > 0) {
      const values = data.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(',');
      const params = [req.params.id];
      data.forEach(r => { params.push(r.sandName, r.kh); });
      await client.query(`INSERT INTO sand_properties (well_id, sand_name, kh) VALUES ${values}`, params);
    }

    await client.query('DELETE FROM allocation_results WHERE well_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, count: data.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save sands error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ============ INTERVENTIONS ============

// GET intervention matrix
router.get('/:id/interventions', async (req, res) => {
  try {
    const { rows: dates } = await pool.query(
      `SELECT intervention_date::text as date FROM intervention_dates WHERE well_id = $1 ORDER BY intervention_date`,
      [req.params.id]
    );
    const { rows: matrix } = await pool.query(
      `SELECT sand_name as "sandName", intervention_date::text as date, is_open as "isOpen"
       FROM intervention_matrix WHERE well_id = $1`,
      [req.params.id]
    );
    const { rows: sands } = await pool.query(
      `SELECT DISTINCT sand_name as "sandName" FROM intervention_matrix WHERE well_id = $1 ORDER BY sand_name`,
      [req.params.id]
    );

    // Build matrix structure
    const sandNames = sands.map(s => s.sandName);
    const interventionDates = dates.map(d => d.date);
    const matrixGrid = sandNames.map(sand =>
      interventionDates.map(date => {
        const cell = matrix.find(m => m.sandName === sand && m.date === date);
        return cell ? cell.isOpen : false;
      })
    );

    res.json({ sandNames, interventionDates, matrix: matrixGrid });
  } catch (err) {
    console.error('Get interventions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST bulk save interventions (replace all)
router.post('/:id/interventions', async (req, res) => {
  const { sandNames, interventionDates, matrix } = req.body;
  if (!Array.isArray(sandNames) || !Array.isArray(interventionDates) || !Array.isArray(matrix)) {
    return res.status(400).json({ error: 'Invalid intervention data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM intervention_matrix WHERE well_id = $1', [req.params.id]);
    await client.query('DELETE FROM intervention_dates WHERE well_id = $1', [req.params.id]);

    // Insert dates
    for (let i = 0; i < interventionDates.length; i++) {
      await client.query(
        'INSERT INTO intervention_dates (well_id, intervention_date, sort_order) VALUES ($1, $2, $3)',
        [req.params.id, interventionDates[i], i]
      );
    }

    // Insert matrix cells
    for (let si = 0; si < sandNames.length; si++) {
      for (let di = 0; di < interventionDates.length; di++) {
        await client.query(
          'INSERT INTO intervention_matrix (well_id, sand_name, intervention_date, is_open) VALUES ($1, $2, $3, $4)',
          [req.params.id, sandNames[si], interventionDates[di], matrix[si]?.[di] || false]
        );
      }
    }

    await client.query('DELETE FROM allocation_results WHERE well_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save interventions error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ============ ALLOCATION RESULTS ============

// GET results
router.get('/:id/results', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT results FROM allocation_results WHERE well_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.json(null);
    res.json(rows[0].results);
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST save results
router.post('/:id/results', async (req, res) => {
  const { results } = req.body;
  try {
    await pool.query(
      `INSERT INTO allocation_results (well_id, results) VALUES ($1, $2)
       ON CONFLICT (well_id) DO UPDATE SET results = $2, created_at = NOW()`,
      [req.params.id, JSON.stringify(results)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
