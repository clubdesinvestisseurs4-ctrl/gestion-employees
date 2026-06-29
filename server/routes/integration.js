const express = require('express');
const { db } = require('../firebase-admin');
const { authenticateService } = require('../middleware/serviceAuth');
const { calculerSalaire, decrementerAvances } = require('../utils/salaire');

const router = express.Router();

// GET /api/integration/employes?etablissement= — utilisé par ERP-Compta pour son module Personnel.
// etablissement omis = tous les employés actifs (toutes établissements).
router.get('/employes', authenticateService, async (req, res) => {
  try {
    const { etablissement } = req.query;
    const snap = await db.collection('utilisateurs').where('role', '==', 'employe').where('actif', '==', true).get();
    let employes = snap.docs.map((d) => {
      const e = d.data();
      return {
        id: d.id,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        poste: e.poste || '',
        etablissementsAccess: e.etablissementsAccess || [],
        salaireMensuel: e.salaireMensuel,
        heuresAttenduesMois: e.heuresAttenduesMois,
      };
    });
    if (etablissement) {
      employes = employes.filter((e) => e.etablissementsAccess.includes(etablissement));
    }
    employes.sort((a, b) => a.nom.localeCompare(b.nom));
    res.json(employes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integration/pointages?etablissement=&periode=YYYY-MM — lecture seule pour ERP-Compta.
router.get('/pointages', authenticateService, async (req, res) => {
  try {
    const { etablissement, periode } = req.query;
    if (!etablissement) {
      return res.status(400).json({ error: 'etablissement est requis' });
    }
    let query = db.collection('pointages').where('etablissement', '==', etablissement);
    const snap = await query.get();
    let pointages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (periode) {
      pointages = pointages.filter((p) => p.date.startsWith(periode));
    }
    pointages.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    res.json(pointages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integration/paie?etablissement=&periode=YYYY-MM — calcul du salaire (formule officielle,
// même fonction que /api/salaires/estimation) pour chaque employé actif de l'établissement.
// C'est la source utilisée par ERP-Compta pour générer ses fiches de paie comptables.
router.get('/paie', authenticateService, async (req, res) => {
  try {
    const { etablissement, periode } = req.query;
    if (!etablissement || !periode) {
      return res.status(400).json({ error: 'etablissement et periode sont requis' });
    }

    const snap = await db.collection('utilisateurs').where('role', '==', 'employe').where('actif', '==', true).get();
    const employes = snap.docs.filter((d) => (d.data().etablissementsAccess || []).includes(etablissement));

    const resultats = [];
    for (const doc of employes) {
      const employe = doc.data();
      const calc = await calculerSalaire(employe, doc.id, periode);
      resultats.push({
        employeId: doc.id,
        employeNom: `${employe.prenom} ${employe.nom}`,
        matricule: employe.matricule,
        poste: employe.poste || '',
        periode,
        ...calc,
      });
    }
    res.json(resultats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integration/avances/decrementer — appelé par ERP-Compta quand une fiche de paie est
// marquée payée, pour garder le solde d'avance à jour côté RH (même mécanique que la route interne
// PATCH /api/salaires/:id quand statut devient "payee").
router.post('/avances/decrementer', authenticateService, async (req, res) => {
  try {
    const { employeId, montant } = req.body;
    if (!employeId || !montant || Number(montant) <= 0) {
      return res.status(400).json({ error: 'employeId et montant (> 0) sont requis' });
    }
    await decrementerAvances(employeId, Number(montant));
    res.json({ message: 'Solde avance mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
