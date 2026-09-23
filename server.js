const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3001;

// Crée la base de données ou l'utilise si elle existe déjà
const db = new Database('database.db');

// Crée les tables si besoin
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

app.use(express.json());
app.use(express.static('public'));

// Fonction d'authentification basique
async function auth(req, res, next) {
  let header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: "Authentification requise." });
  }
  let infos = Buffer.from(header.split(' ')[1], 'base64').toString().split(':');
  let username = infos[0];
  let password = infos[1];

  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: "Authentification requise." });
  }
  let valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: "Authentification requise." });
  }
  req.user = user;
  next();
}

// Route d'inscription
app.post('/register', async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Le nom d’utilisateur et le mot de passe sont obligatoires." });
  }
  username = username.trim();
  if (username === '' || username.includes(' ')) {
    return res.status(400).json({ message: "Le nom d’utilisateur ne doit pas contenir d’espace." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    let stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    let info = stmt.run(username, hash);
    res.status(201).json({
      message: "Inscription réussie.",
      user: { id: info.lastInsertRowid, username }
    });
  } catch (e) {
    if (e.code && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ message: "Ce nom d’utilisateur est déjà utilisé." });
    } else {
      res.status(500).json({ message: "Erreur lors de l'inscription." });
    }
  }
});

// Accueil
app.get('/', (req, res) => {
  res.json({ message: 'Le système de sécurité de la Batcave est opérationnel.' });
});

// Affiche la page privée
app.get('/bat-computer', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'bat-computer.html'));
});

// Lister les armes
app.get('/api/secrets', auth, (req, res) => {
  res.json([
    { name: 'Batarang', desc: 'Arme de jet', icon: 'fa-shuriken' },
    { name: 'Grapple Gun', desc: 'Grappin de grimpe', icon: 'fa-anchor' },
    { name: 'Batmobile', desc: 'Véhicule de poursuite', icon: 'fa-car' }
  ]);
});

// Retourne l'utilisateur connecté
app.get('/api/me', auth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// Enregistrer un rapport
app.post('/api/reports', auth, (req, res) => {
  let { content } = req.body;
  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Le rapport de mission est obligatoire." });
  }
  let info = db.prepare('INSERT INTO reports (user_id, content) VALUES (?, ?)').run(req.user.id, content.trim());
  res.status(201).json({
    message: "Rapport enregistré.",
    report: {
      id: info.lastInsertRowid,
      userId: req.user.id,
      content: content.trim()
    }
  });
});

// Lance le serveur
app.listen(PORT, () => {
  console.log('Serveur en ligne sur http://localhost:' + PORT);
});
