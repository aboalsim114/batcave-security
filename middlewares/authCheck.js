function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  res.redirect('/auth/login');
}

module.exports = isAuthenticated;
