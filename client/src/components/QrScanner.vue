<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';

const emit = defineEmits(['scan', 'error']);
const containerId = `qr-reader-${Math.random().toString(36).slice(2)}`;
const starting = ref(true);
let html5QrCode = null;
let stopped = false;

function messageCamera(err) {
  const s = String(err?.name || err?.message || err || '');
  if (/NotAllowedError|Permission/i.test(s)) {
    return "Vous devez autoriser l'accès à la caméra pour pointer. Activez-la dans les réglages de votre navigateur ou de votre téléphone, puis réessayez.";
  }
  if (/NotFoundError/i.test(s)) {
    return 'Aucune caméra détectée sur cet appareil.';
  }
  if (/NotReadableError|TrackStart/i.test(s)) {
    return 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.';
  }
  return "Impossible d'accéder à la caméra. Vérifiez les autorisations puis réessayez.";
}

onMounted(async () => {
  html5QrCode = new Html5Qrcode(containerId);
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 230 },
      async (decodedText) => {
        if (stopped) return;
        stopped = true;
        // Arrêt complet de la caméra avant de notifier le parent : appeler stop() une seule
        // fois ici évite la course avec onBeforeUnmount (double stop() concurrent qui pouvait
        // laisser le flux caméra bloqué et empêcher tout nouveau scan).
        try { await html5QrCode.stop(); } catch { /* déjà arrêté */ }
        emit('scan', decodedText);
      },
      () => {} // erreurs de scan "frame sans QR" ignorées en continu
    );
    starting.value = false;
  } catch (err) {
    emit('error', messageCamera(err));
  }
});

onBeforeUnmount(async () => {
  stopped = true;
  try {
    if (html5QrCode) {
      await html5QrCode.stop();
      html5QrCode.clear();
    }
  } catch { /* déjà arrêté */ }
});
</script>

<template>
  <div class="qr-scanner">
    <div v-if="starting" class="qr-starting">
      <div class="spinner"></div>
      <p class="muted" style="margin:10px 0 0">Ouverture de la caméra…</p>
    </div>
    <div :id="containerId" class="qr-reader-box"></div>
  </div>
</template>

<style scoped>
.qr-reader-box {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  animation: scanPulse 1.6s ease-in-out infinite;
}
.qr-starting { padding: 24px 0; animation: fadeInUp 0.3s ease both; }

@keyframes scanPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(26,107,60,0.35); }
  50% { box-shadow: 0 0 0 8px rgba(26,107,60,0); }
}
</style>
