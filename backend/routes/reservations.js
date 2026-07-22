const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const generateBookingNumber = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `SV-${suffix}`;
};

router.get('/', async (req, res) => {
  try {
    const { status, route_id, date, search } = req.query;
    let sql = 'SELECT r.*, t.departure, t.arrival, t.time FROM reservations r LEFT JOIN trajets t ON r.route_id = t.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (route_id) { sql += ' AND r.route_id = ?'; params.push(route_id); }
    if (date) { sql += ' AND r.travel_date = ?'; params.push(date); }
    if (search) { sql += ' AND r.booking_number LIKE ?'; params.push(`%${search}%`); }
    sql += ' ORDER BY r.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur get reservations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/occupied', async (req, res) => {
  try {
    const { route_id, date } = req.query;
    if (!route_id || !date) return res.json([]);
    const [rows] = await db.query(
      'SELECT selected_seats FROM reservations WHERE route_id = ? AND travel_date = ? AND status != ?',
      [route_id, date, 'cancelled']
    );
    const occupied = new Set();
    rows.forEach((r) => {
      if (r.selected_seats) r.selected_seats.split(',').forEach((s) => occupied.add(Number(s)));
    });
    res.json([...occupied]);
  } catch (err) {
    console.error('Erreur occupied seats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Réservation introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur get reservation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { route_id, travel_date, passenger_count, passengers, selected_seats, total_amount, contact_name, contact_phone } = req.body;
    if (!route_id || !travel_date || !passenger_count) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    const booking_number = generateBookingNumber();
    const now = new Date().toISOString();
    const [result] = await db.query(
      'INSERT INTO reservations (booking_number, route_id, travel_date, passenger_count, total_amount, status, passengers, selected_seats, contact_name, contact_phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [booking_number, route_id, travel_date, passenger_count, total_amount || 0, 'pending', passengers || '', selected_seats || '', contact_name || '', contact_phone || '', now, now]
    );
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur create reservation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'pending', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    await db.query('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), req.params.id]);
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur update status:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Réservation supprimée' });
  } catch (err) {
    console.error('Erreur delete reservation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
