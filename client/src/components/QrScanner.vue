<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';

const emit = defineEmits(['scan', 'error']);
const containerId = `qr-reader-${Math.random().toString(36).slice(2)}`;
const starting = ref(true);
let html5QrCode = null;
let stopped = false;

onMounted(async () => {
  html5QrCode = new Html5Qrcode(containerId);
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 230 },
      async (decodedText) => {
        if (stopped) return;
        stopped = true;
        emit('scan', decodedText);
        try { await html5QrCode.stop(); } catch { /* déjà arrêté */ }
      },
      () => {} // erreurs de scan "frame sans QR" ignorées en continu
    );
    starting.value = false;
  } catch (err) {
    emit('error', err?.message || 'Impossible d\'accéder à la caméra');
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
    <div v-if="starting" class="muted">Ouverture de la caméra…</div>
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
}
</style>
