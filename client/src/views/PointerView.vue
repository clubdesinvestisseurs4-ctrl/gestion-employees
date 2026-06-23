<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/client';
import QrScanner from '../components/QrScanner.vue';

const scanning = ref(false);
const message = ref('');
const messageType = ref('success');
const loading = ref(false);
const todayPointage = ref(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function chargerAujourdhui() {
  try {
    const periode = todayStr().slice(0, 7);
    const pointages = await api.get(`/api/pointages?periode=${periode}`);
    todayPointage.value = pointages.find((p) => p.date === todayStr()) || null;
  } catch {
    todayPointage.value = null;
  }
}

onMounted(chargerAujourdhui);

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas disponible sur cet appareil'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(new Error('Impossible d\'obtenir votre position : ' + err.message)),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

async function onScan(decodedText) {
  scanning.value = false;
  message.value = '';
  loading.value = true;
  try {
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      throw new Error('QR code non reconnu');
    }
    const { etablissement, qrToken } = payload;
    if (!etablissement || !qrToken) {
      throw new Error('QR code non reconnu');
    }

    const coords = await getPosition();
    const result = await api.post('/api/pointages/scan', {
      etablissement,
      qrToken,
      lat: coords.latitude,
      lng: coords.longitude,
    });

    messageType.value = 'success';
    message.value = result.type === 'arrivee'
      ? `Arrivée enregistrée à ${result.heureArrivee}`
      : `Départ enregistré à ${result.heureDepart} (${result.heures} h travaillées)`;
    await chargerAujourdhui();
  } catch (err) {
    messageType.value = 'error';
    message.value = err.message;
  } finally {
    loading.value = false;
  }
}

function onScanError(err) {
  scanning.value = false;
  messageType.value = 'error';
  message.value = err;
}
</script>

<template>
  <div>
    <h1 class="page-title">Pointer</h1>

    <div class="card" style="text-align:center">
      <div v-if="todayPointage" class="muted" style="margin-bottom:16px">
        Aujourd'hui : arrivée {{ todayPointage.heureArrivee || '—' }}
        · départ {{ todayPointage.heureDepart || '—' }}
        <span v-if="todayPointage.heures"> · {{ todayPointage.heures }} h</span>
      </div>
      <div v-else class="muted" style="margin-bottom:16px">Vous n'avez pas encore pointé aujourd'hui</div>

      <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

      <QrScanner v-if="scanning" @scan="onScan" @error="onScanError" />

      <button
        v-else
        class="btn btn-lg"
        :disabled="loading || (todayPointage && todayPointage.heureDepart)"
        @click="scanning = true; message = ''"
      >
        {{ loading ? 'Enregistrement…' : 'Pointer' }}
      </button>

      <p v-if="todayPointage && todayPointage.heureDepart" class="muted" style="margin-top:14px">
        Vous avez déjà pointé votre arrivée et votre départ aujourd'hui.
      </p>
    </div>

    <div class="card muted">
      Scannez le QR code affiché à l'entrée de votre établissement. Vous devez être connecté au Wi-Fi
      de l'entreprise et physiquement sur le site pour que le pointage soit accepté.
    </div>
  </div>
</template>
