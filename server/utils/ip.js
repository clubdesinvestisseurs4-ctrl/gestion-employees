// Normalise l'IP cliente (Express avec trust proxy renvoie parfois "::ffff:1.2.3.4")
function getClientIp(req) {
  const ip = req.ip || '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

module.exports = { getClientIp };
