const crypto = require('crypto');

// Authentification serveur-à-serveur pour les routes /api/integration, consommées par
// d'autres applications internes (ex: ERP-Compta) via une clé partagée, sans JWT utilisateur.
function authenticateService(req, res, next) {
  const key = req.headers['x-service-key'];
  const expected = process.env.INTEGRATION_API_KEY;

  // Comparaison à temps constant pour éviter une attaque par timing sur la clé partagée.
  // timingSafeEqual exige des buffers de même longueur, donc on vérifie d'abord la longueur
  // (cette comparaison-là n'a pas besoin d'être constante : elle ne fuite qu'une longueur, pas le secret).
  const keyBuf = Buffer.from(String(key || ''));
  const expectedBuf = Buffer.from(String(expected || ''));
  const valid = Boolean(expected) && keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf);

  if (!valid) {
    return res.status(401).json({ error: 'Clé de service invalide' });
  }
  next();
}

module.exports = { authenticateService };
