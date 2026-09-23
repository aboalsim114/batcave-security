const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const PORT = process.env.PORT === undefined ? 3001 : Number(process.env.PORT);
const app = express();
const database = new Database('database.db');

database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

app.use(express.json());
app.use(express.static('public'));

function refuseAccess(response) {
  response.set('WWW-Authenticate', 'Basic realm="Batcave"');
  return response.status(401).json({
    message: 'Authentification requise.',
  });
}

async function checkBasicAuth(request, response, next) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Basic ')) {
    return refuseAccess(response);
  }

  const encoded = header.slice('Basic '.length);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');

  if (separator === -1) {
    return refuseAccess(response);
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const user = database
    .prepare('SELECT id, username, password FROM users WHERE username = ?')
    .get(username);

  if (!user) {
    return refuseAccess(response);
  }

  const passwordOk = await bcrypt.compare(password, user.password);

  if (!passwordOk) {
    return refuseAccess(response);
  }

  request.user = {
    id: user.id,
    username: user.username,
  };

  next();
}

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

app.get('/bat-computer', checkBasicAuth, (_request, response) => {
  response.sendFile(path.join(__dirname, 'private', 'bat-computer.html'));
});

app.get('/api/secrets', checkBasicAuth, (_request, response) => {
  response.json([
    { name: 'Batarang', desc: 'Arme de jet', icon: 'fa-shuriken' },
    { name: 'Grapple Gun', desc: 'Grappin de grimpe', icon: 'fa-anchor' },
    { name: 'Batmobile', desc: 'Véhicule de poursuite', icon: 'fa-car' },
  ]);
});

app.get('/api/me', checkBasicAuth, (request, response) => {
  response.json({
    id: request.user.id,
    username: request.user.username,
  });
});

app.post('/api/reports', checkBasicAuth, (request, response) => {
  const { content } = request.body;

  if (typeof content !== 'string' || !content.trim()) {
    return response.status(400).json({
      message: 'Le rapport de mission est obligatoire.',
    });
  }

  const result = database
    .prepare('INSERT INTO reports (user_id, content) VALUES (?, ?)')
    .run(request.user.id, content.trim());

  return response.status(201).json({
    message: 'Rapport enregistré.',
    report: {
      id: result.lastInsertRowid,
      userId: request.user.id,
      content: content.trim(),
    },
  });
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
