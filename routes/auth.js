const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Le système de sécurité de la Batcave est opérationnel.' });
});

router.get('/auth/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/auth/login', async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/auth/login?erreur=1');
  }

  username = username.trim();

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);

  if (!user) {
    return res.redirect('/auth/login?erreur=1');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.redirect('/auth/login?erreur=1');
  }

  // Nouveau badge : évite qu'un pirate réutilise un ancien ID de session
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).send('Erreur de session.');
    }

    req.session.user = {
      id: user.id,
      username: user.username,
    };

    res.redirect('/bat-computer');
  });
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Erreur de déconnexion.');
    }

    res.clearCookie('bat_identity');
    res.redirect('/auth/login');
  });
});

router.post('/register', async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Le nom d’utilisateur et le mot de passe sont obligatoires.',
    });
  }

  username = username.trim();

  if (username === '' || username.includes(' ')) {
    return res.status(400).json({
      message: 'Le nom d’utilisateur ne doit pas contenir d’espace.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const info = db
      .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(username, hash);

    res.status(201).json({
      message: 'Inscription réussie.',
      user: { id: info.lastInsertRowid, username },
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ message: 'Ce nom d’utilisateur est déjà utilisé.' });
    } else {
      res.status(500).json({ message: 'Erreur lors de l’inscription.' });
    }
  }
});

module.exports = router;
