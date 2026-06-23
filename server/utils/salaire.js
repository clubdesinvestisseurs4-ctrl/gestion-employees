const { db } = require('../firebase-admin');
const { round2 } = require('./heures');

// Compte les jours de [dateDebut, dateFin] qui tombent dans le mois `periode` (YYYY-MM)
function joursDansPeriode(dateDebut, dateFin, periode) {
  const [annee, mois] = periode.split('-').map(Number);
  const debutMois = new Date(annee, mois - 1, 1);
  const finMois = new Date(annee, mois, 0);
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  const start = d1 > debutMois ? d1 : debutMois;
  const end = d2 < finMois ? d2 : finMois;
  if (start > end) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function dureeHeures(heureDebut, heureFin) {
  const [h1, m1] = heureDebut.split(':').map(Number);
  const [h2, m2] = heureFin.split(':').map(Number);
  return round2(((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

async function heuresPointeesPeriode(employeId, periode) {
  const snap = await db.collection('pointages').where('employeId', '==', employeId).get();
  let total = 0;
  for (const doc of snap.docs) {
    const p = doc.data();
    if (p.date.startsWith(periode) && (p.statutJour === 'complet' || p.statutJour === 'corrige') && p.heures) {
      total += p.heures;
    }
  }
  return round2(total);
}

// Congés exceptionnels et permissions approuvés = payés intégralement (comptent comme heures travaillées)
async function heuresCongesPayeesPeriode(employeId, periode, heuresParJour) {
  const snap = await db.collection('demandes')
    .where('employeId', '==', employeId)
    .where('statut', '==', 'approuvee')
    .get();

  let total = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.type === 'conge' && d.dateDebut && d.dateFin) {
      total += joursDansPeriode(d.dateDebut, d.dateFin, periode) * heuresParJour;
    } else if (d.type === 'permission' && d.dateDebut && d.dateDebut.startsWith(periode) && d.heureDebut && d.heureFin) {
      total += dureeHeures(d.heureDebut, d.heureFin);
    }
  }
  return round2(total);
}

async function soldeAvancesDues(employeId) {
  const snap = await db.collection('demandes')
    .where('employeId', '==', employeId)
    .where('type', '==', 'avance')
    .get();
  let total = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.soldeRestant && d.soldeRestant > 0) total += d.soldeRestant;
  }
  return round2(total);
}

// salaireBrut = salaireMensuel * (heuresPointees + heuresCongesPayees) / heuresAttenduesMois
async function calculerSalaire(employe, employeId, periode) {
  const heuresPointees = await heuresPointeesPeriode(employeId, periode);
  const heuresCongesPayees = await heuresCongesPayeesPeriode(employeId, periode, employe.heuresParJour || 8);
  const totalHeures = round2(heuresPointees + heuresCongesPayees);
  const heuresAttenduesMois = employe.heuresAttenduesMois || 208;
  const salaireBrutCalcule = round2((employe.salaireMensuel * totalHeures) / heuresAttenduesMois);
  const soldeAvances = await soldeAvancesDues(employeId);
  const avanceDeduite = round2(Math.min(soldeAvances, salaireBrutCalcule));
  const salaireNet = round2(salaireBrutCalcule - avanceDeduite);

  return {
    heuresPointees,
    heuresCongesPayees,
    totalHeures,
    heuresAttenduesMois,
    salaireMensuelBase: employe.salaireMensuel,
    salaireBrutCalcule,
    avanceDeduite,
    salaireNet,
  };
}

// FIFO : décrémente le solde des avances les plus anciennes d'abord, jusqu'à épuisement du montant
async function decrementerAvances(employeId, montantADeduire) {
  let reste = montantADeduire;
  const snap = await db.collection('demandes')
    .where('employeId', '==', employeId)
    .where('type', '==', 'avance')
    .get();

  const avances = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => a.soldeRestant && a.soldeRestant > 0)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  for (const avance of avances) {
    if (reste <= 0) break;
    const deduction = Math.min(avance.soldeRestant, reste);
    await db.collection('demandes').doc(avance.id).update({ soldeRestant: round2(avance.soldeRestant - deduction) });
    reste = round2(reste - deduction);
  }
}

module.exports = { calculerSalaire, decrementerAvances };
