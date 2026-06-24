const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { nextCodeConnexion } = require('../utils/counters');

const router = express.Router();

const PIN_RE = /^\d{4}$/;

function publicEmploye(doc) {
  const { passwordHash, pinHash, ...rest } = doc.data();
  return { id: doc.id, ...rest };
}

// GET /api/employes?etablissement=ohinene — liste des employés actifs (admin) ou son propre profil (employé)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { etablissement } = req.query;

    if (req.user.role !== 'admin') {
      const doc = await db.collection('utilisateurs').doc(req.user.id).get();
      return res.json([publicEmploye(doc)]);
    }

    let query = db.collection('utilisateurs').where('role', '==', 'employe').where('actif', '==', true);
    const snap = await query.get();
    let employes = snap.docs.map(publicEmploye);

    if (etablissement) {
      employes = employes.filter((e) => (e.etablissementsAccess || []).includes(etablissement));
    }
    employes.sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`));
    res.json(employes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employes — admin only, crée un compte employé.
// matricule = identifiant officiel existant (saisi par l'admin, peut contenir des lettres).
// codeConnexion = code purement numérique généré automatiquement, utilisé pour se connecter à
// l'app (pavé numérique). pin = secret à 4 chiffres associé au compte.
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      matricule, nom, prenom, pin, poste, telephone,
      salaireMensuel, heuresAttenduesMois, heuresParJour, etablissementsAccess,
    } = req.body;

    if (!matricule || !nom || !prenom || !pin) {
      return res.status(400).json({ error: 'matricule, nom, prenom et pin sont requis' });
    }
    if (!PIN_RE.test(pin)) {
      return res.status(400).json({ error: 'pin doit contenir exactement 4 chiffres' });
    }
    if (!Array.isArray(etablissementsAccess) || etablissementsAccess.length === 0) {
      return res.status(400).json({ error: 'etablissementsAccess doit contenir au moins un établissement' });
    }
    if (!salaireMensuel || salaireMensuel <= 0) {
      return res.status(400).json({ error: 'salaireMensuel doit être > 0' });
    }

    const matriculeNorm = String(matricule).trim();
    const existing = await db.collection('utilisateurs').where('matricule', '==', matriculeNorm).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Ce matricule est déjà utilisé' });
    }

    const codeConnexion = await nextCodeConnexion();
    const pinHash = await bcrypt.hash(pin, 10);

    const employe = {
      matricule: matriculeNorm,
      codeConnexion,
      nom,
      prenom,
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      role: 'employe',
      poste: poste || '',
      telephone: telephone || '',
      salaireMensuel: Number(salaireMensuel),
      heuresAttenduesMois: Number(heuresAttenduesMois) || 208,
      heuresParJour: Number(heuresParJour) || 8,
      etablissementsAccess,
      actif: true,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('utilisateurs').add(employe);
    const { pinHash: _, ...safe } = employe;
    res.status(201).json({ id: ref.id, ...safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employes/:id — admin only, mise à jour partielle (hors PIN)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ref = db.collection('utilisateurs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'employe') {
      return res.status(404).json({ error: 'Employé introuvable' });
    }

    const allowed = [
      'matricule', 'nom', 'prenom', 'poste', 'telephone', 'salaireMensuel',
      'heuresAttenduesMois', 'heuresParJour', 'etablissementsAccess', 'actif',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.matricule !== undefined) {
      const matriculeNorm = String(updates.matricule).trim();
      if (!matriculeNorm) {
        return res.status(400).json({ error: 'matricule ne peut pas être vide' });
      }
      const existing = await db.collection('utilisateurs').where('matricule', '==', matriculeNorm).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== req.params.id) {
        return res.status(409).json({ error: 'Ce matricule est déjà utilisé' });
      }
      updates.matricule = matriculeNorm;
    }

    await ref.update(updates);
    const updated = await ref.get();
    res.json(publicEmploye(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employes/:id/reinitialiser-pin — admin only
router.post('/:id/reinitialiser-pin', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nouveauPin } = req.body;
    if (!PIN_RE.test(nouveauPin || '')) {
      return res.status(400).json({ error: 'nouveauPin doit contenir exactement 4 chiffres' });
    }

    const ref = db.collection('utilisateurs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'employe') {
      return res.status(404).json({ error: 'Employé introuvable' });
    }

    const pinHash = await bcrypt.hash(nouveauPin, 10);
    await ref.update({ pinHash, pinFailedAttempts: 0, pinLockedUntil: null });
    res.json({ message: 'PIN réinitialisé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employes/:id — admin only, désactivation (soft delete)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ref = db.collection('utilisateurs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'employe') {
      return res.status(404).json({ error: 'Employé introuvable' });
    }
    await ref.update({ actif: false });
    res.json({ message: 'Employé désactivé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
