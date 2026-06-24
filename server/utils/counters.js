const { db } = require('../firebase-admin');

// Génère un matricule séquentiel purement numérique (1001, 1002...) via un compteur
// transactionnel Firestore. Volontairement sans lettres : l'employé doit pouvoir le saisir
// sur un simple pavé numérique, sans savoir lire ni écrire.
async function nextMatricule() {
  const counterRef = db.collection('compteurs').doc('employes');

  const next = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const dernier = doc.exists ? doc.data().dernierNumero : 0;
    const n = dernier + 1;
    tx.set(counterRef, { dernierNumero: n });
    return n;
  });

  return String(1000 + next);
}

module.exports = { nextMatricule };
