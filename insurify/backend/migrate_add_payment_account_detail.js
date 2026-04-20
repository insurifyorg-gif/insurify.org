const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'insurify.db');
const db = new sqlite3.Database(dbPath);

function addColumnIfNotExists(table, column, type) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) return reject(err);
      const exists = columns.some(col => col.name === column);
      if (exists) {
        console.log(`Column '${column}' already exists in '${table}'.`);
        return resolve();
      }
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
        if (err) return reject(err);
        console.log(`Added column '${column}' to '${table}'.`);
        resolve();
      });
    });
  });
}

(async () => {
  try {
    await addColumnIfNotExists('deductible_payments', 'payment_account_detail', 'TEXT');
    db.close();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  }
})();
