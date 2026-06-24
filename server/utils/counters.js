const { db } = require('../firebase-admin');

// Génère un code de connexion séquentiel purement numérique (1001, 1002...) via un compteur
// transactionnel Firestore. Distinct du matricule officiel (qui peut contenir des lettres et
// est saisi manuellement par l'admin) : ce code sert uniquement à se connecter à l'app sur un
// pavé numérique, sans savoir lire ni écrire.
async function nextCodeConnexion() {
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

module.exports = { nextCodeConnexion };
