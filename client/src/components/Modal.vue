<script setup>
defineProps({
  type: { type: String, default: 'info' }, // 'error' | 'success' | 'info'
  title: { type: String, default: '' },
  message: { type: String, required: true },
});
const emit = defineEmits(['close']);
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box" :class="type" role="alertdialog" aria-modal="true">
      <div class="modal-icon">{{ type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️' }}</div>
      <h3 v-if="title" class="modal-title">{{ title }}</h3>
      <p class="modal-message">{{ message }}</p>
      <button class="btn" style="width:100%" autofocus @click="emit('close')">OK</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}
.modal-box {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 24px 20px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
.modal-icon { font-size: 36px; margin-bottom: 8px; }
.modal-title { margin: 0 0 8px; font-size: 17px; }
.modal-box.error .modal-title { color: var(--danger); }
.modal-box.success .modal-title { color: var(--success); }
.modal-message { color: var(--text-main); font-size: 14px; margin: 0 0 18px; line-height: 1.5; }
</style>
