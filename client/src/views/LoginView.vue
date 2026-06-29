<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push('/admin');
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-screen">
    <form class="card login-card" @submit.prevent="submit">
      <div class="login-brand">Gestion Employés</div>
      <p class="muted">Connexion administrateur</p>

      <div v-if="error" class="alert error">{{ error }}</div>

      <div class="form-group">
        <label>Identifiant</label>
        <input v-model="username" type="text" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </div>

      <button class="btn" type="submit" :disabled="loading" style="width:100%">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>

      <router-link to="/connexion" class="admin-link">Connexion employé (matricule + PIN)</router-link>
    </form>
  </div>
</template>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-sidebar);
  padding: 16px;
}
.login-card {
  width: 100%;
  max-width: 340px;
}
.login-brand {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}
.admin-link {
  display: block;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}
</style>
