const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
const app = express();
const database = new Database('database.db');

database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);

app.use(express.json());

app.get('/', (_request, response) => {
  response.json({ message: 'Le système de sécurité de la Batcave est opérationnel.' });
});

const server = app.listen(PORT, () => {
  const address = server.address();
  const activePort = typeof address === 'object' ? address.port : PORT;

  console.log(`Serveur de la Batcave démarré sur http://localhost:${activePort}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
