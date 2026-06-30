<script setup>
defineProps({
  type: { type: String, default: 'info' }, // 'error' | 'success' | 'info'
  title: { type: String, default: '' },
  message: { type: String, required: true },
});
const emit = defineEmits(['close']);
</script>

<template>
  <Transition name="modal" appear>
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-box" :class="type" role="alertdialog" aria-modal="true">
        <div class="modal-icon">{{ type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️' }}</div>
        <h3 v-if="title" class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <button class="btn" style="width:100%" autofocus @click="emit('close')">OK</button>
      </div>
    </div>
  </Transition>
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
.modal-icon { font-size: 36px; margin-bottom: 8px; animation: popIcon 0.35s ease both 0.05s; }
.modal-title { margin: 0 0 8px; font-size: 17px; }
.modal-box.error .modal-title { color: var(--danger); }
.modal-box.success .modal-title { color: var(--success); }
.modal-message { color: var(--text-main); font-size: 14px; margin: 0 0 18px; line-height: 1.5; }

@keyframes popIcon {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.modal-enter-from .modal-box, .modal-leave-to .modal-box {
  transform: scale(0.9) translateY(14px);
  opacity: 0;
}
</style>
