// Authentification serveur-à-serveur pour les routes /api/integration, consommées par
// d'autres applications internes (ex: ERP-Compta) via une clé partagée, sans JWT utilisateur.
function authenticateService(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!process.env.INTEGRATION_API_KEY || key !== process.env.INTEGRATION_API_KEY) {
    return res.status(401).json({ error: 'Clé de service invalide' });
  }
  next();
}

module.exports = { authenticateService };
