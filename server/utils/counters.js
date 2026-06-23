const { db } = require('../firebase-admin');

// Génère un matricule séquentiel du type EMP-0001 via un compteur transactionnel Firestore.
async function nextMatricule() {
  const counterRef = db.collection('compteurs').doc('employes');

  const next = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const dernier = doc.exists ? doc.data().dernierNumero : 0;
    const n = dernier + 1;
    tx.set(counterRef, { dernierNumero: n });
    return n;
  });

  return `EMP-${String(next).padStart(4, '0')}`;
}

module.exports = { nextMatricule };
