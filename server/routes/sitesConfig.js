const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireEtablissementAccess } = require('../middleware/etablissement');
const { getClientIp } = require('../utils/ip');

const router = express.Router();

const DEFAULT_CONFIG = {
  qrToken: null,
  qrGeneratedAt: null,
  allowedIps: [],
  gpsLat: null,
  gpsLng: null,
  gpsRadiusMeters: 150,
};

// GET /api/sites-config/ip-actuelle — utilisé par le bouton "Utiliser mon IP actuelle"
router.get('/ip-actuelle', authenticateToken, (req, res) => {
  // DEBUG TEMPORAIRE : à retirer une fois le bon nombre de hops Render confirmé (voir utils/ip.js)
  res.json({
    ip: getClientIp(req),
    debugXForwardedFor: req.headers['x-forwarded-for'] || null,
    debugReqIp: req.ip,
  });
});

// GET /api/sites-config/:etablissement — admin only
router.get('/:etablissement', authenticateToken, requireRole('admin'), requireEtablissementAccess, async (req, res) => {
  try {
    const doc = await db.collection('sitesConfig').doc(req.params.etablissement).get();
    res.json(doc.exists ? doc.data() : DEFAULT_CONFIG);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sites-config/:etablissement — admin only, met à jour IP/GPS
router.put('/:etablissement', authenticateToken, requireRole('admin'), requireEtablissementAccess, async (req, res) => {
  try {
    const { allowedIps, gpsLat, gpsLng, gpsRadiusMeters } = req.body;
    const updates = {};
    if (allowedIps !== undefined) {
      if (!Array.isArray(allowedIps)) {
        return res.status(400).json({ error: 'allowedIps doit être un tableau' });
      }
      updates.allowedIps = allowedIps;
    }
    if (gpsLat !== undefined) updates.gpsLat = Number(gpsLat);
    if (gpsLng !== undefined) updates.gpsLng = Number(gpsLng);
    if (gpsRadiusMeters !== undefined) updates.gpsRadiusMeters = Number(gpsRadiusMeters);

    const ref = db.collection('sitesConfig').doc(req.params.etablissement);
    await ref.set(updates, { merge: true });
    const updated = await ref.get();
    res.json(updated.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sites-config/:etablissement/regenerer-qr — admin only, invalide l'ancien QR
router.post('/:etablissement/regenerer-qr', authenticateToken, requireRole('admin'), requireEtablissementAccess, async (req, res) => {
  try {
    const { etablissement } = req.params;
    const qrToken = crypto.randomUUID();
    const ref = db.collection('sitesConfig').doc(etablissement);
    await ref.set({ qrToken, qrGeneratedAt: new Date().toISOString() }, { merge: true });

    const payload = JSON.stringify({ etablissement, qrToken });
    const qrImage = await QRCode.toDataURL(payload, { width: 400, margin: 2 });

    res.json({ qrToken, qrImage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sites-config/:etablissement/qr-image — admin only, réimprime le QR actuel sans le régénérer
router.get('/:etablissement/qr-image', authenticateToken, requireRole('admin'), requireEtablissementAccess, async (req, res) => {
  try {
    const doc = await db.collection('sitesConfig').doc(req.params.etablissement).get();
    const qrToken = doc.exists ? doc.data().qrToken : null;
    if (!qrToken) {
      return res.status(404).json({ error: 'Aucun QR généré pour cet établissement' });
    }
    const payload = JSON.stringify({ etablissement: req.params.etablissement, qrToken });
    const qrImage = await QRCode.toDataURL(payload, { width: 400, margin: 2 });
    res.json({ qrToken, qrImage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
