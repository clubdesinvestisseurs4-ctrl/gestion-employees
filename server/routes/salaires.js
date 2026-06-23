const express = require('express');
const { db } = require('../firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculerSalaire, decrementerAvances } = require('../utils/salaire');

const router = express.Router();

function periodeCourante() {
  return new Date().toISOString().slice(0, 7);
}

// GET /api/salaires/estimation?periode=YYYY-MM&employeId= — vue en direct, non persistée
// L'employé voit la sienne ; l'admin peut consulter celle de n'importe quel employé via employeId.
router.get('/estimation', authenticateToken, async (req, res) => {
  try {
    const periode = req.query.periode || periodeCourante();
    let employeId = req.query.employeId;

    if (req.user.role !== 'admin') {
      employeId = req.user.id;
    }
    if (!employeId) {
      return res.status(400).json({ error: 'employeId est requis' });
    }

    const doc = await db.collection('utilisateurs').doc(employeId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Employé introuvable' });

    const estimation = await calculerSalaire(doc.data(), employeId, periode);
    res.json({ employeId, periode, ...estimation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/salaires/:etablissement/generer?periode=YYYY-MM — admin only
// Génère une fiche "brouillon" par employé actif de l'établissement n'en ayant pas déjà pour cette période.
router.post('/:etablissement/generer', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { etablissement } = req.params;
    const periode = req.query.periode || periodeCourante();

    const employesSnap = await db.collection('utilisateurs')
      .where('role', '==', 'employe')
      .where('actif', '==', true)
      .get();
    const employes = employesSnap.docs.filter((d) => (d.data().etablissementsAccess || []).includes(etablissement));

    const existantesSnap = await db.collection('fichesSalaire')
      .where('etablissement', '==', etablissement)
      .where('periode', '==', periode)
      .get();
    const dejaTraites = new Set(existantesSnap.docs.map((d) => d.data().employeId));

    const fichesCreees = [];
    for (const doc of employes) {
      if (dejaTraites.has(doc.id)) continue;
      const employe = doc.data();
      const calc = await calculerSalaire(employe, doc.id, periode);
      const fiche = {
        employeId: doc.id,
        employeNom: `${employe.prenom} ${employe.nom}`,
        etablissement,
        periode,
        ...calc,
        statut: 'brouillon',
        createdAt: new Date().toISOString(),
      };
      const ref = await db.collection('fichesSalaire').add(fiche);
      fichesCreees.push({ id: ref.id, ...fiche });
    }

    res.status(201).json({ message: `${fichesCreees.length} fiche(s) générée(s)`, fiches: fichesCreees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/salaires/:etablissement?periode= — admin only
router.get('/:etablissement', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { etablissement } = req.params;
    const { periode } = req.query;

    let query = db.collection('fichesSalaire').where('etablissement', '==', etablissement);
    if (periode) query = query.where('periode', '==', periode);

    const snap = await query.get();
    const fiches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    fiches.sort((a, b) => (a.employeNom > b.employeNom ? 1 : -1));
    res.json(fiches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/salaires/:id — admin only, fait avancer le statut (brouillon -> validee -> payee)
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { statut } = req.body;
    if (!['validee', 'payee'].includes(statut)) {
      return res.status(400).json({ error: 'statut doit être validee ou payee' });
    }

    const ref = db.collection('fichesSalaire').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Fiche introuvable' });

    const fiche = doc.data();
    if (statut === 'validee' && fiche.statut !== 'brouillon') {
      return res.status(409).json({ error: 'Seule une fiche en brouillon peut être validée' });
    }
    if (statut === 'payee' && fiche.statut !== 'validee') {
      return res.status(409).json({ error: 'Seule une fiche validée peut être marquée payée' });
    }

    if (statut === 'payee' && fiche.avanceDeduite > 0) {
      await decrementerAvances(fiche.employeId, fiche.avanceDeduite);
    }

    await ref.update({ statut });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
