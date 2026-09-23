const bcrypt = require('bcrypt');
const db = require('../config/db');

async function checkAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  const infos = Buffer.from(header.split(' ')[1], 'base64').toString().split(':');
  const username = infos[0];
  const password = infos[1];

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  req.user = user;
  next();
}

module.exports = checkAuth;
