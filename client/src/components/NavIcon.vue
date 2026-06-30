<script setup>
defineProps({
  name: { type: String, required: true },
});
</script>

<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'camera'">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8 7l1.4-2.3h5.2L16 7" />
      <circle cx="12" cy="13.4" r="3.2" />
    </template>
    <template v-else-if="name === 'wallet'">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
      <circle cx="16.5" cy="14.3" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'clipboard'">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <rect x="9" y="2.4" width="6" height="3" rx="1" />
      <path d="M9 11h6M9 14.5h6M9 18h3.5" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-4 3-6.4 7-6.4s7 2.4 7 6.4" />
    </template>
    <template v-else-if="name === 'chart'">
      <rect x="4" y="11" width="4" height="9" rx="1" fill="currentColor" stroke="none" />
      <rect x="10" y="6" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="16" y="14" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.2" r="2.4" opacity="0.55" />
      <path d="M3.3 20c0-3.6 2.6-6.1 5.7-6.1s5.7 2.5 5.7 6.1" />
      <path d="M14.8 14.6c2.5 0.3 4.2 2.5 4.2 5.4" opacity="0.55" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l3.2 1.9" />
    </template>
    <template v-else-if="name === 'inbox'">
      <path d="M3.4 12h4.6l1.4 2.8h5.2L16 12h4.6" />
      <path d="M4.6 12L7 4.8h10l2.4 7.2" />
      <rect x="3.4" y="12" width="17.2" height="7" rx="1.6" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3.1" />
      <circle cx="12" cy="12" r="8" stroke-dasharray="2.1 3" />
    </template>
  </svg>
</template>

<style scoped>
.nav-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
</style>
