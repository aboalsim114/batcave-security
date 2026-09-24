const express = require('express');
const fs = require('fs');
const path = require('path');
const isAuthenticated = require('../middlewares/authCheck');
const db = require('../config/db');

const router = express.Router();

router.get('/bat-computer', isAuthenticated, (req, res) => {
  let html = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'bat-computer.html'),
    'utf8'
  );

  html = html.replace(
    'Chargement du profil...',
    'Bienvenue, ' + req.session.user.username
  );

  res.send(html);
});

router.get('/api/secrets', isAuthenticated, (req, res) => {
  res.json([
    { name: 'Batarang', desc: 'Arme de jet', icon: 'fa-shuriken' },
    { name: 'Grapple Gun', desc: 'Grappin de grimpe', icon: 'fa-anchor' },
    { name: 'Batmobile', desc: 'Véhicule de poursuite', icon: 'fa-car' },
  ]);
});

router.get('/api/me', isAuthenticated, (req, res) => {
  res.json({
    id: req.session.user.id,
    username: req.session.user.username,
  });
});

router.post('/api/reports', isAuthenticated, (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({
      message: 'Le rapport de mission est obligatoire.',
    });
  }

  const info = db
    .prepare('INSERT INTO reports (user_id, content) VALUES (?, ?)')
    .run(req.session.user.id, content.trim());

  res.status(201).json({
    message: 'Rapport enregistré.',
    report: {
      id: info.lastInsertRowid,
      userId: req.session.user.id,
      content: content.trim(),
    },
  });
});

module.exports = router;
