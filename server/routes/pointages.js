const express = require('express');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calcHeures } = require('../utils/heures');
const { getClientIp } = require('../utils/ip');

const router = express.Router();

const HEURE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function todayParts() {
  const now = new Date();
  return { date: now.toISOString().slice(0, 10), heure: now.toISOString().slice(11, 16) };
}

// POST /api/pointages/scan — appelé après le scan du QR fixe côté employé
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { etablissement, qrToken } = req.body;

    if (!etablissement || !qrToken) {
      return res.status(400).json({ error: 'etablissement et qrToken sont requis' });
    }
    if (!(req.user.etablissementsAccess || []).includes(etablissement)) {
      return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement" });
    }

    const configDoc = await db.collection('sitesConfig').doc(etablissement).get();
    const config = configDoc.exists ? configDoc.data() : null;

    if (!config || !config.qrToken) {
      return res.status(409).json({ error: "Le pointage n'est pas encore configuré pour cet établissement, contactez l'admin" });
    }
    if (qrToken !== config.qrToken) {
      return res.status(403).json({ error: 'QR code invalide ou expiré, demandez à l\'admin de le réimprimer' });
    }

    if (!config.allowedIps || config.allowedIps.length === 0) {
      return res.status(409).json({ error: "Aucune adresse IP autorisée n'est configurée, contactez l'admin" });
    }
    const clientIp = getClientIp(req);
    if (!config.allowedIps.includes(clientIp)) {
      return res.status(403).json({ error: 'Vous devez être connecté au Wi-Fi de l\'entreprise pour pointer' });
    }

    const { date, heure } = todayParts();
    const docId = `${req.user.id}_${date}`;
    const ref = db.collection('pointages').doc(docId);
    const existing = await ref.get();
    const data = existing.exists ? existing.data() : null;

    if (!data || !data.heureArrivee) {
      const pointage = {
        employeId: req.user.id,
        employeNom: `${req.user.prenom} ${req.user.nom}`,
        etablissement,
        date,
        heureArrivee: heure,
        arriveeIp: clientIp,
        statutJour: 'en_cours',
        createdAt: new Date().toISOString(),
      };
      await ref.set(pointage);
      return res.status(201).json({ id: docId, type: 'arrivee', ...pointage });
    }

    if (!data.heureDepart) {
      const heures = calcHeures(data.heureArrivee, heure);
      const updates = {
        heureDepart: heure,
        departIp: clientIp,
        heures,
        statutJour: 'complet',
      };
      await ref.update(updates);
      return res.json({ id: docId, type: 'depart', ...data, ...updates });
    }

    return res.status(409).json({ error: 'Vous avez déjà pointé votre arrivée et votre départ aujourd\'hui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/pointages?etablissement=&employeId=&periode=YYYY-MM
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { etablissement, periode } = req.query;
    let employeId = req.query.employeId;

    if (req.user.role !== 'admin') {
      employeId = req.user.id;
    }

    let query = db.collection('pointages');
    if (employeId) query = query.where('employeId', '==', employeId);
    if (etablissement) query = query.where('etablissement', '==', etablissement);

    const snap = await query.get();
    let pointages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (periode) {
      pointages = pointages.filter((p) => p.date.startsWith(periode));
    }
    pointages.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    res.json(pointages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/pointages/:id — admin only, correction manuelle d'un pointage oublié/erroné
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { heureArrivee, heureDepart } = req.body;
    if (heureArrivee && !HEURE_RE.test(heureArrivee)) {
      return res.status(400).json({ error: 'heureArrivee invalide (attendu HH:MM)' });
    }
    if (heureDepart && !HEURE_RE.test(heureDepart)) {
      return res.status(400).json({ error: 'heureDepart invalide (attendu HH:MM)' });
    }

    const ref = db.collection('pointages').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Pointage introuvable' });
    }

    const data = doc.data();
    const updates = { statutJour: 'corrige' };
    if (heureArrivee) updates.heureArrivee = heureArrivee;
    if (heureDepart) updates.heureDepart = heureDepart;

    const finalArrivee = updates.heureArrivee || data.heureArrivee;
    const finalDepart = updates.heureDepart || data.heureDepart;
    if (finalArrivee && finalDepart) {
      updates.heures = calcHeures(finalArrivee, finalDepart);
    }

    await ref.update(updates);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
