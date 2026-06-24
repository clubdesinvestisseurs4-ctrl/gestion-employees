const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function buildToken(user, docId) {
  return jwt.sign(
    {
      id: docId,
      username: user.username,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      etablissementsAccess: user.etablissementsAccess || [],
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function publicUser(docId, user) {
  const { passwordHash, pinHash, ...rest } = user;
  return { id: docId, ...rest };
}

const PIN_RE = /^\d{4}$/;
const MAX_TENTATIVES_PIN = 5;
const VERROUILLAGE_MS = 15 * 60 * 1000;

// POST /api/auth/seed — crée le 1er compte admin, uniquement si aucun utilisateur n'existe encore
router.post('/seed', async (req, res) => {
  try {
    const existing = await db.collection('utilisateurs').limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Des comptes existent déjà, seed refusé' });
    }

    const passwordHash = await bcrypt.hash('Admin@2026!', 10);
    const admin = {
      matricule: 'ADMIN-0001',
      nom: 'Admin',
      prenom: 'Principal',
      username: 'admin',
      passwordHash,
      role: 'admin',
      etablissementsAccess: ['ohinene', 'cookafrica'],
      actif: true,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection('utilisateurs').add(admin);

    res.status(201).json({
      message: 'Admin créé : username=admin / password=Admin@2026! (à changer immédiatement)',
      user: publicUser(ref.id, admin),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username et password sont requis' });
    }

    const snap = await db
      .collection('utilisateurs')
      .where('username', '==', username.toLowerCase().trim())
      .where('actif', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const doc = snap.docs[0];
    const user = doc.data();
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const token = buildToken(user, doc.id);
    res.json({ token, user: publicUser(doc.id, user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-employe — connexion employé par matricule + PIN 4 chiffres (pas de mot de passe à lire/mémoriser)
router.post('/login-employe', async (req, res) => {
  try {
    const { matricule, pin } = req.body;
    if (!matricule || !pin) {
      return res.status(400).json({ error: 'matricule et pin sont requis' });
    }

    const snap = await db
      .collection('utilisateurs')
      .where('matricule', '==', String(matricule).trim())
      .where('role', '==', 'employe')
      .where('actif', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'Matricule ou code PIN incorrect' });
    }

    const doc = snap.docs[0];
    const user = doc.data();

    if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
      const minutes = Math.ceil((new Date(user.pinLockedUntil) - new Date()) / 60000);
      return res.status(429).json({ error: `Trop de tentatives, réessayez dans ${minutes} min` });
    }

    const match = await bcrypt.compare(String(pin), user.pinHash);
    if (!match) {
      const tentatives = (user.pinFailedAttempts || 0) + 1;
      const updates = { pinFailedAttempts: tentatives };
      if (tentatives >= MAX_TENTATIVES_PIN) {
        updates.pinLockedUntil = new Date(Date.now() + VERROUILLAGE_MS).toISOString();
        updates.pinFailedAttempts = 0;
      }
      await doc.ref.update(updates);
      return res.status(401).json({ error: 'Matricule ou code PIN incorrect' });
    }

    if (user.pinFailedAttempts || user.pinLockedUntil) {
      await doc.ref.update({ pinFailedAttempts: 0, pinLockedUntil: null });
    }

    const token = buildToken(user, doc.id);
    res.json({ token, user: publicUser(doc.id, user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/changer-pin — l'employé change son propre PIN
router.post('/changer-pin', authenticateToken, async (req, res) => {
  try {
    const { ancienPin, nouveauPin } = req.body;
    if (!PIN_RE.test(nouveauPin || '')) {
      return res.status(400).json({ error: 'nouveauPin doit contenir exactement 4 chiffres' });
    }

    const ref = db.collection('utilisateurs').doc(req.user.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'employe') {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const match = await bcrypt.compare(String(ancienPin || ''), doc.data().pinHash);
    if (!match) {
      return res.status(401).json({ error: 'Ancien PIN incorrect' });
    }

    const pinHash = await bcrypt.hash(nouveauPin, 10);
    await ref.update({ pinHash });
    res.json({ message: 'PIN mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/changer-mot-de-passe
router.post('/changer-mot-de-passe', authenticateToken, async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;
    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ error: 'ancienMotDePasse et nouveauMotDePasse sont requis' });
    }
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const ref = db.collection('utilisateurs').doc(req.user.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const match = await bcrypt.compare(ancienMotDePasse, doc.data().passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }

    const passwordHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await ref.update({ passwordHash });
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
