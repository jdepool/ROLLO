const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET inventory by warehouse with stock levels
router.get('/', async (req, res) => {
  try {
    const { warehouse_id, store_id, low_stock, expiring_days } = req.query;
    let query = `
      SELECT i.*,
             p.name AS product_name, p.unit, p.min_stock, p.cost_price,
             p.shelf_life_days,
             pc.name AS category_name, pc.color AS category_color, pc.icon AS category_icon,
             s.name AS supplier_name,
             w.name AS warehouse_name,
             st.name AS store_name,
             CASE WHEN i.quantity <= p.min_stock THEN true ELSE false END AS is_low_stock,
             CASE WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN true ELSE false END AS expiring_soon
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      JOIN warehouses w ON w.id = i.warehouse_id
      JOIN stores st ON st.id = w.store_id
      WHERE 1=1`;
    const params = [];

    if (warehouse_id) { params.push(warehouse_id); query += ` AND i.warehouse_id = $${params.length}`; }
    if (store_id)     { params.push(store_id); query += ` AND w.store_id = $${params.length}`; }
    if (low_stock === 'true') query += ` AND i.quantity <= p.min_stock`;
    if (expiring_days) { params.push(expiring_days); query += ` AND i.expiry_date <= CURRENT_DATE + ($${params.length} || ' days')::INTERVAL`; }

    query += ' ORDER BY p.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET stock summary for a store (dashboard)
router.get('/summary/:store_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT i.product_id) AS total_products,
         SUM(i.quantity * COALESCE(i.unit_cost, p.cost_price)) AS total_value,
         COUNT(CASE WHEN i.quantity <= p.min_stock AND i.quantity > 0 THEN 1 END) AS low_stock_count,
         COUNT(CASE WHEN i.quantity = 0 THEN 1 END) AS out_of_stock_count,
         COUNT(CASE WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END) AS expiring_soon_count
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN warehouses w ON w.id = i.warehouse_id
       WHERE w.store_id = $1`,
      [req.params.store_id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add inventory (entry/reception)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { warehouse_id, product_id, quantity, unit_cost, expiry_date,
            manufacture_date, batch_number, notes, created_by } = req.body;

    // Check if same product+batch already exists in this warehouse
    const existing = await client.query(
      `SELECT id, quantity FROM inventory
       WHERE warehouse_id=$1 AND product_id=$2 AND (batch_number=$3 OR batch_number IS NULL)
       LIMIT 1`,
      [warehouse_id, product_id, batch_number]
    );

    let inv;
    if (existing.rows.length && !batch_number) {
      // Update existing stock
      inv = await client.query(
        `UPDATE inventory SET quantity = quantity + $1, unit_cost = $2 WHERE id = $3 RETURNING *`,
        [quantity, unit_cost, existing.rows[0].id]
      );
    } else {
      // New inventory record (new batch)
      inv = await client.query(
        `INSERT INTO inventory (warehouse_id, product_id, quantity, unit_cost, expiry_date,
         manufacture_date, batch_number, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [warehouse_id, product_id, quantity, unit_cost, expiry_date, manufacture_date, batch_number, notes]
      );
    }

    // Log movement
    await client.query(
      `INSERT INTO inventory_movements
       (warehouse_id, product_id, movement_type, quantity, unit_cost, notes, created_by)
       VALUES ($1,$2,'entrada',$3,$4,$5,$6)`,
      [warehouse_id, product_id, quantity, unit_cost, notes, created_by]
    );

    await client.query('COMMIT');
    res.status(201).json(inv.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT adjust inventory (manual adjustment)
router.put('/:id/adjust', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { quantity, reason, created_by } = req.body;
    const inv = await client.query('SELECT * FROM inventory WHERE id=$1', [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Inventory record not found' });

    const old_qty = parseFloat(inv.rows[0].quantity);
    const diff = quantity - old_qty;

    await client.query('UPDATE inventory SET quantity=$1 WHERE id=$2', [quantity, req.params.id]);
    await client.query(
      `INSERT INTO inventory_movements
       (warehouse_id, product_id, movement_type, quantity, notes, created_by, reference_type)
       VALUES ($1,$2,'ajuste',$3,$4,$5,'manual_adjustment')`,
      [inv.rows[0].warehouse_id, inv.rows[0].product_id, diff, reason, created_by]
    );

    await client.query('COMMIT');
    res.json({ message: 'Adjusted', old_quantity: old_qty, new_quantity: quantity });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// GET movement history
router.get('/movements', async (req, res) => {
  try {
    const { warehouse_id, product_id, limit = 50 } = req.query;
    let query = `
      SELECT im.*, p.name AS product_name, p.unit,
             w.name AS warehouse_name
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      LEFT JOIN warehouses w ON w.id = im.warehouse_id
      WHERE 1=1`;
    const params = [];

    if (warehouse_id) { params.push(warehouse_id); query += ` AND im.warehouse_id = $${params.length}`; }
    if (product_id)   { params.push(product_id); query += ` AND im.product_id = $${params.length}`; }

    params.push(limit);
    query += ` ORDER BY im.created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
