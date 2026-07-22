function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
}

module.exports = { requireAdmin };

