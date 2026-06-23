// Vérifie que l'utilisateur authentifié a accès à l'établissement demandé (param :etablissement),
// admin ou employé — chacun est limité à son (ses) établissement(s) via etablissementsAccess.
function requireEtablissementAccess(req, res, next) {
  const { etablissement } = req.params;
  if ((req.user.etablissementsAccess || []).includes(etablissement)) {
    return next();
  }
  return res.status(403).json({ error: 'Accès refusé à cet établissement' });
}

module.exports = { requireEtablissementAccess };
