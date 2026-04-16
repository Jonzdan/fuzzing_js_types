const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("analysis.db");

/**
 * Ignore local variables, focus on global variables / function / class definitions
 * types of trace log entries present in table 3.3. page 31
 */


// TODO: update table design if we need a db at all
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            kind TEXT,
            name TEXT,
            value TEXT
        )
    `);
});

function insertEvent(e) {
    db.run(
        `INSERT INTO events (type, name, value) VALUES (?, ?, ?)`,
        [e.type, e.name, JSON.stringify(e.value)]
    );
}

const lines = fs.readFileSync("logs/trace.log", "utf-8")
  .split("\n")
  .filter(Boolean);

db.serialize(() => {
  db.run("BEGIN TRANSACTION");

  for (const line of lines) {
    try {
      const e = JSON.parse(line);

      insertEvent({
        type: e.type,
        name: e.name,
        value: e.value
      });

    } catch (err) {
      console.error("Bad line:", line);
    }
  }

  db.run("COMMIT", () => {
    console.log(`Imported ${lines.length} events into SQLite`);
    db.close();
  });
});
