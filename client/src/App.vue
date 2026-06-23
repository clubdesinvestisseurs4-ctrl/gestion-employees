<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AppLayout from './layouts/AppLayout.vue';

const route = useRoute();
const auth = useAuthStore();

onMounted(() => {
  auth.init();
});
</script>

<template>
  <AppLayout v-if="!route.meta.public && auth.isAuthenticated">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>
