const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { nextMatricule } = require('../utils/counters');

const router = express.Router();

function publicEmploye(doc) {
  const { passwordHash, ...rest } = doc.data();
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

// POST /api/employes — admin only, crée un compte employé
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      nom, prenom, username, password, poste, telephone,
      salaireMensuel, heuresAttenduesMois, heuresParJour, etablissementsAccess,
    } = req.body;

    if (!nom || !prenom || !username || !password) {
      return res.status(400).json({ error: 'nom, prenom, username et password sont requis' });
    }
    if (!Array.isArray(etablissementsAccess) || etablissementsAccess.length === 0) {
      return res.status(400).json({ error: 'etablissementsAccess doit contenir au moins un établissement' });
    }
    if (!salaireMensuel || salaireMensuel <= 0) {
      return res.status(400).json({ error: 'salaireMensuel doit être > 0' });
    }

    const usernameNorm = username.toLowerCase().trim();
    const existing = await db.collection('utilisateurs').where('username', '==', usernameNorm).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Cet identifiant est déjà utilisé' });
    }

    const matricule = await nextMatricule();
    const passwordHash = await bcrypt.hash(password, 10);

    const employe = {
      matricule,
      nom,
      prenom,
      username: usernameNorm,
      passwordHash,
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
    const { passwordHash: _, ...safe } = employe;
    res.status(201).json({ id: ref.id, ...safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employes/:id — admin only, mise à jour partielle (hors mot de passe)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ref = db.collection('utilisateurs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'employe') {
      return res.status(404).json({ error: 'Employé introuvable' });
    }

    const allowed = [
      'nom', 'prenom', 'poste', 'telephone', 'salaireMensuel',
      'heuresAttenduesMois', 'heuresParJour', 'etablissementsAccess', 'actif',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await ref.update(updates);
    const updated = await ref.get();
    res.json(publicEmploye(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employes/:id/reinitialiser-mot-de-passe — admin only
router.post('/:id/reinitialiser-mot-de-passe', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nouveauMotDePasse } = req.body;
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
      return res.status(400).json({ error: 'nouveauMotDePasse doit contenir au moins 6 caractères' });
    }

    const ref = db.collection('utilisateurs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Employé introuvable' });
    }

    const passwordHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await ref.update({ passwordHash });
    res.json({ message: 'Mot de passe réinitialisé' });
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
