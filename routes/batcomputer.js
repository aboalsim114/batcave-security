const express = require('express');
const path = require('path');
const checkAuth = require('../middlewares/checkAuth');
const db = require('../config/db');

const router = express.Router();

router.get('/bat-computer', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'bat-computer.html'));
});

router.get('/api/secrets', checkAuth, (req, res) => {
  res.json([
    { name: 'Batarang', desc: 'Arme de jet', icon: 'fa-shuriken' },
    { name: 'Grapple Gun', desc: 'Grappin de grimpe', icon: 'fa-anchor' },
    { name: 'Batmobile', desc: 'Véhicule de poursuite', icon: 'fa-car' },
  ]);
});

router.get('/api/me', checkAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

router.post('/api/reports', checkAuth, (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({
      message: 'Le rapport de mission est obligatoire.',
    });
  }

  const info = db
    .prepare('INSERT INTO reports (user_id, content) VALUES (?, ?)')
    .run(req.user.id, content.trim());

  res.status(201).json({
    message: 'Rapport enregistré.',
    report: {
      id: info.lastInsertRowid,
      userId: req.user.id,
      content: content.trim(),
    },
  });
});

module.exports = router;
