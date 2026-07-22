const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trajets ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Erreur get trajets:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trajets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Trajet introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur get trajet:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { departure, arrival, time, price, seats, active } = req.body;
    if (!departure || !arrival || !time || !price) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    const [result] = await db.query(
      'INSERT INTO trajets (departure, arrival, time, price, seats, active) VALUES (?, ?, ?, ?, ?, ?)',
      [departure, arrival, time, price, seats || 45, active === undefined ? 1 : active]
    );
    const [rows] = await db.query('SELECT * FROM trajets WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur create trajet:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { departure, arrival, time, price, seats, active } = req.body;
    await db.query(
      'UPDATE trajets SET departure = ?, arrival = ?, time = ?, price = ?, seats = ?, active = ? WHERE id = ?',
      [departure, arrival, time, price, seats, active, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM trajets WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur update trajet:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM trajets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Trajet supprimé' });
  } catch (err) {
    console.error('Erreur delete trajet:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
