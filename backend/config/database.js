const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const USE_MYSQL = process.env.DB_HOST && process.env.DB_USER;

let db;
let mode = 'sqlite';

async function initializeDatabase() {
  if (USE_MYSQL) {
    mode = 'mysql';
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      ssl: process.env.DB_SSL === 'true' ? { ca: fs.readFileSync(path.join(__dirname, '../ca.pem')) } : undefined
    });
    await createMysqlTables();
  } else {
    mode = 'sqlite';
    const dbPath = path.join(__dirname, '../sava_voyages.db');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    createSqliteTables();
  }
  await seedAdmin();
}

function createSqliteTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
    );
    CREATE TABLE IF NOT EXISTS trajets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      departure TEXT NOT NULL,
      arrival TEXT NOT NULL,
      time TEXT NOT NULL,
      price INTEGER NOT NULL,
      seats INTEGER NOT NULL DEFAULT 45,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_number TEXT UNIQUE NOT NULL,
      route_id INTEGER NOT NULL,
      travel_date TEXT NOT NULL,
      passenger_count INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      passengers TEXT,
      selected_seats TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM trajets').get().c;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO trajets (departure, arrival, time, price, seats, active) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const trajets = [
      ['Sambava', 'Vohemar', '07:00', 25000, 45, 1],
      ['Sambava', 'Antalaha', '08:30', 20000, 45, 1],
      ['Sambava', 'Andapa', '09:00', 18000, 45, 1],
      ['Vohemar', 'Sambava', '13:00', 25000, 45, 1],
      ['Vohemar', 'Antalaha', '14:00', 22000, 45, 1],
      ['Antalaha', 'Sambava', '10:00', 20000, 45, 1],
      ['Antalaha', 'Vohemar', '15:30', 22000, 45, 1],
      ['Antalaha', 'Andapa', '11:00', 15000, 45, 1],
      ['Andapa', 'Sambava', '12:00', 18000, 45, 1],
      ['Andapa', 'Antalaha', '16:00', 15000, 45, 1],
      ['Vohemar', 'Andapa', '17:00', 24000, 45, 1],
      ['Andapa', 'Vohemar', '06:30', 24000, 45, 1]
    ];
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
    insertMany(trajets);
  }
}

async function createMysqlTables() {
  const conn = await db.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin'
      );
      CREATE TABLE IF NOT EXISTS trajets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        departure VARCHAR(255) NOT NULL,
        arrival VARCHAR(255) NOT NULL,
        time VARCHAR(20) NOT NULL,
        price INT NOT NULL,
        seats INT NOT NULL DEFAULT 45,
        active TINYINT NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        route_id INT NOT NULL,
        travel_date VARCHAR(20) NOT NULL,
        passenger_count INT NOT NULL,
        total_amount INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        passengers TEXT,
        selected_seats TEXT,
        created_at VARCHAR(30),
        updated_at VARCHAR(30)
      );
    `);
  } finally {
    conn.release();
  }
}

async function seedAdmin() {
  const username = process.env.ADMIN_USER || 'admin';
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  if (mode === 'sqlite') {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!existing) {
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, 'admin');
    }
  } else {
    await db.query(
      'INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, 'admin']
    );
  }
}

const query = (sql, params = []) => {
  if (mode === 'sqlite') {
    const stmt = db.prepare(sql);
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA')) {
      return [stmt.all(...params)];
    }
    const info = stmt.run(...params);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
  }
  return db.query(sql, params);
};

module.exports = { db: { query }, initializeDatabase, getMode: () => mode };
