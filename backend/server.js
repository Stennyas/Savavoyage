const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db, initializeDatabase, getMode } = require('./config/database');
const trajetsRouter = require('./routes/trajets');
const reservationsRouter = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'sava-voyages-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
}));

app.use(express.static(path.join(__dirname, '../frontend')));

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
}

app.use('/api/trajets', trajetsRouter);
app.use('/api/reservations', reservationsRouter);

app.post('/api/login', loginHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Déconnexion réussie' });
});
app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session && req.session.admin ? req.session.admin : null });
});

async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants requis' });
    }
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Identifiants incorrects' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Accès administrateur requis' });
    req.session.admin = { id: user.id, username: user.username, role: user.role };
    res.json({ message: 'Connexion réussie', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const [reservations] = await db.query('SELECT status, COUNT(*) AS count, SUM(total_amount) AS revenue FROM reservations GROUP BY status');
    const [totalRows] = await db.query('SELECT COUNT(*) AS count, SUM(passenger_count) AS passengers FROM reservations');
    const [trajetsRows] = await db.query('SELECT COUNT(*) AS count FROM trajets WHERE active = 1');
    const [seatsRows] = await db.query('SELECT SUM(seats) AS total FROM trajets WHERE active = 1');
    res.json({ byStatus: reservations, totals: totalRows[0], activeTrajets: trajetsRows[0].count, totalSeats: seatsRows[0].total || 0 });
  } catch (err) {
    console.error('Erreur stats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Sava Voyages backend démarré sur le port ${PORT} (mode: ${getMode()})`);
      console.log(`[Server] Frontend: http://localhost:${PORT}`);
      console.log(`[Server] API: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('[Server] Erreur au démarrage:', err);
  }
}

startServer();

module.exports = app;
