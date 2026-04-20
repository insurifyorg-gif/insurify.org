// Fresh database reset - delete old db and recreate everything
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'insurify.db');

// Create fresh database (this will overwrite the old one)
const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

async function setupDatabase() {
  await run(`DROP TABLE IF EXISTS claims`);
  await run(`DROP TABLE IF EXISTS policies`);
  await run(`DROP TABLE IF EXISTS users`);

  // Policies table with coverage_amount as TEXT
  await run(`CREATE TABLE policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    coverage_amount TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Claims table
  await run(`CREATE TABLE claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_number TEXT NOT NULL,
    claim_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    claim_date DATE NOT NULL,
    description TEXT NOT NULL,
    claimed_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    documents TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(policy_number) REFERENCES policies(policy_number)
  )`);

  // Users table
  await run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default admin
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  await run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    ['admin', hashedPassword, 'admin']
  );

  // Insert sample policy
  await run(
    `INSERT INTO policies (policy_number, customer_name, customer_email, policy_type, coverage_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['POL-1768091073309-D3O25QLXI', 'James bond Micheal', 'bond@gmail.com', 'Auto', '1000-50000', '2026-01-01', '2026-12-31']
  );

  console.log('✓ Database reset complete');
  console.log('✓ Sample policy created');
  db.close();
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

setupDatabase().catch(err => {
  console.error('Error:', err.message);
  db.close();
});
