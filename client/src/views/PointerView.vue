<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/client';
import QrScanner from '../components/QrScanner.vue';
import Modal from '../components/Modal.vue';

const phase = ref('idle'); // idle | scanning | validating
const message = ref('');
const messageType = ref('success');
const popup = ref(null); // { type, title, message }
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

function startPointage() {
  message.value = '';
  popup.value = null;
  phase.value = 'scanning';
}

async function onScan(decodedText) {
  phase.value = 'validating';
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

    const result = await api.post('/api/pointages/scan', { etablissement, qrToken });

    messageType.value = 'success';
    message.value = result.type === 'arrivee'
      ? `Arrivée enregistrée à ${result.heureArrivee}`
      : `Départ enregistré à ${result.heureDepart} (${result.heures} h travaillées)`;
    await chargerAujourdhui();
  } catch (err) {
    popup.value = { type: 'error', title: 'Pointage refusé', message: err.message };
  } finally {
    phase.value = 'idle';
  }
}

function onScanError(err) {
  phase.value = 'idle';
  popup.value = { type: 'error', title: 'Caméra indisponible', message: err };
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

      <QrScanner v-if="phase === 'scanning'" @scan="onScan" @error="onScanError" />

      <div v-else-if="phase === 'validating'" class="validating">
        <div class="spinner"></div>
        <p class="muted" style="margin:10px 0 0">Validation en cours…</p>
      </div>

      <button
        v-else
        class="btn btn-lg"
        :disabled="todayPointage && todayPointage.heureDepart"
        @click="startPointage"
      >
        Pointer
      </button>

      <p v-if="todayPointage && todayPointage.heureDepart" class="muted" style="margin-top:14px">
        Vous avez déjà pointé votre arrivée et votre départ aujourd'hui.
      </p>
    </div>

    <div class="card muted">
      Scannez le QR code affiché à l'entrée de votre établissement. Vous devez être connecté au Wi-Fi
      de l'entreprise pour que le pointage soit accepté.
    </div>

    <Modal
      v-if="popup"
      :type="popup.type"
      :title="popup.title"
      :message="popup.message"
      @close="popup = null"
    />
  </div>
</template>

<style scoped>
.validating { padding: 24px 0; }
</style>
