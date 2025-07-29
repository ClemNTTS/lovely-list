const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'data', 'database.db');


/**
 * The function `initDb` initializes a SQLite database connection and creates a table named `items` if
 * it doesn't already exist.
 * @returns The `initDb` function is returning the SQLite database object `db` after initializing it
 * and creating a table named `items` if it doesn't already exist in the database.
 */
function initDb(){
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database ' + DB_PATH + ': ' + err.message);
    } else {
      console.log('Connected to database ' + DB_PATH);
      db.run(`
        CREATE TABLE IF NOT EXISTS items(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          type TEXT NOT NULL, -- 'task' or 'note'
          is_done BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table: ' + err.message);
        } else {
          console.log('Table `items` created successfully');
        }
      });
    }
  });
  return db;
}

module.exports = initDb();