// Durée en heures entre deux horaires HH:MM, gère les shifts de nuit (départ <= arrivée => +24h)
function calcHeures(heureArrivee, heureDepart) {
  const [h1, m1] = heureArrivee.split(':').map(Number);
  const [h2, m2] = heureDepart.split(':').map(Number);
  let minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { calcHeures, round2 };
