const express = require('express');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const TYPES = ['avance', 'permission', 'absence', 'conge'];
const SOUS_TYPES_CONGE = ['deces', 'mariage', 'accouchement', 'paternite'];

function validatePayload(body) {
  const { type, montant, dateDebut, dateFin, heureDebut, heureFin, sousType } = body;

  if (!TYPES.includes(type)) {
    return 'type doit être avance, permission, absence ou conge';
  }
  if (type === 'avance') {
    if (!montant || Number(montant) <= 0) return 'montant doit être > 0 pour une avance';
  }
  if (type === 'permission') {
    if (!dateDebut || !heureDebut || !heureFin) return 'dateDebut, heureDebut et heureFin sont requis pour une permission';
  }
  if (type === 'absence') {
    if (!dateDebut || !dateFin) return 'dateDebut et dateFin sont requis pour une absence';
  }
  if (type === 'conge') {
    if (!SOUS_TYPES_CONGE.includes(sousType)) return 'sousType doit être deces, mariage, accouchement ou paternite';
    if (!dateDebut || !dateFin) return 'dateDebut et dateFin sont requis pour un congé';
  }
  return null;
}

// POST /api/demandes — l'employé soumet une demande
router.post('/', authenticateToken, async (req, res) => {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { type, sousType, dateDebut, dateFin, heureDebut, heureFin, montant, motif, etablissement } = req.body;
    if (!etablissement || !(req.user.etablissementsAccess || []).includes(etablissement)) {
      return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement" });
    }

    const demande = {
      employeId: req.user.id,
      employeNom: `${req.user.prenom} ${req.user.nom}`,
      etablissement,
      type,
      sousType: type === 'conge' ? sousType : null,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      heureDebut: heureDebut || null,
      heureFin: heureFin || null,
      montant: type === 'avance' ? Number(montant) : null,
      motif: motif || '',
      statut: 'en_attente',
      commentaireAdmin: '',
      traitePar: null,
      traiteAt: null,
      montantVerse: null,
      soldeRestant: null,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('demandes').add(demande);
    res.status(201).json({ id: ref.id, ...demande });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/demandes/moi — mes propres demandes
router.get('/moi', authenticateToken, async (req, res) => {
  try {
    const snap = await db.collection('demandes').where('employeId', '==', req.user.id).get();
    const demandes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    demandes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json(demandes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/demandes?etablissement=&statut=&type=&employeId= — admin only
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { etablissement, statut, type, employeId } = req.query;
    let query = db.collection('demandes');
    if (etablissement) query = query.where('etablissement', '==', etablissement);
    if (statut) query = query.where('statut', '==', statut);
    if (type) query = query.where('type', '==', type);
    if (employeId) query = query.where('employeId', '==', employeId);

    const snap = await query.get();
    const demandes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    demandes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json(demandes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PATCH /api/demandes/:id — admin only, approuve ou refuse
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { statut, commentaireAdmin } = req.body;
    if (!['approuvee', 'refusee'].includes(statut)) {
      return res.status(400).json({ error: 'statut doit être approuvee ou refusee' });
    }

    const ref = db.collection('demandes').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Demande introuvable' });
    if (doc.data().statut !== 'en_attente') {
      return res.status(409).json({ error: 'Cette demande a déjà été traitée' });
    }

    await ref.update({
      statut,
      commentaireAdmin: commentaireAdmin || '',
      traitePar: req.user.username,
      traiteAt: new Date().toISOString(),
    });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/demandes/:id/verser — admin only, marque une avance approuvée comme versée
router.post('/:id/verser', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ref = db.collection('demandes').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Demande introuvable' });

    const demande = doc.data();
    if (demande.type !== 'avance' || demande.statut !== 'approuvee') {
      return res.status(409).json({ error: 'Seule une avance approuvée peut être versée' });
    }
    if (demande.montantVerse) {
      return res.status(409).json({ error: 'Cette avance a déjà été versée' });
    }

    await ref.update({ montantVerse: demande.montant, soldeRestant: demande.montant });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
