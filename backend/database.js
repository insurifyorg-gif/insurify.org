const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'insurify.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

const initializeDatabase = () => {
  // Users table (for admin login)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err);
  });

  // Policies table
  db.run(`
    CREATE TABLE IF NOT EXISTS policies (
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
    )
  `, (err) => {
    if (err) console.error('Error creating policies table:', err);
  });

  // Claims table
  db.run(`
    CREATE TABLE IF NOT EXISTS claims (
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
    )
  `, (err) => {
    if (err) console.error('Error creating claims table:', err);
    else {
      // Deductible payments table (with payment_account_detail)
      db.run(`
        CREATE TABLE IF NOT EXISTS deductible_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          claim_number TEXT NOT NULL UNIQUE,
          deductible_amount REAL NOT NULL,
          payment_status TEXT DEFAULT 'pending',
          payment_date DATETIME,
          payment_link TEXT,
          due_date DATE NOT NULL,
          reminder_sent INTEGER DEFAULT 0,
          payment_account_detail TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(claim_number) REFERENCES claims(claim_number)
        )
      `, (err) => {
        if (err) console.error('Error creating deductible_payments table:', err);
      });
      // Only insert admin after tables are created
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin', hashedPassword, 'admin'],
        (err) => {
          if (err) console.error('Error inserting default admin:', err);
          else console.log('✓ Database tables created/verified');
        }
      );
    }
  });
};

module.exports = {
  db,
  initializeDatabase,
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};
