const express = require('express');
const bcrypt = require('bcrypt');
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
app.use(express.static('public'));

app.post('/register', async (request, response) => {
  const { username, password } = request.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return response.status(400).json({
      message: 'Le nom d’utilisateur et le mot de passe sont obligatoires.',
    });
  }

  const cleanUsername = username.trim();

  if (!cleanUsername || cleanUsername.includes(' ')) {
    return response.status(400).json({
      message: 'Le nom d’utilisateur ne doit pas contenir d’espace.',
    });
  }

  if (password.length < 8) {
    return response.status(400).json({
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = database
      .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(cleanUsername, hashedPassword);

    return response.status(201).json({
      message: 'Inscription réussie.',
      user: {
        id: result.lastInsertRowid,
        username: cleanUsername,
      },
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return response.status(409).json({
        message: 'Ce nom d’utilisateur est déjà utilisé.',
      });
    }

    console.error(error);
    return response.status(500).json({
      message: 'Une erreur est survenue pendant l’inscription.',
    });
  }
});

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
