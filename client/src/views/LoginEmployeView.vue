<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NumPad from '../components/NumPad.vue';

const etape = ref('matricule'); // 'matricule' | 'pin'
const matricule = ref('');
const pin = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

function allerAuPin() {
  if (!matricule.value) return;
  error.value = '';
  etape.value = 'pin';
}

function retour() {
  etape.value = 'matricule';
  pin.value = '';
  error.value = '';
}

async function valider() {
  if (!pin.value) return;
  error.value = '';
  loading.value = true;
  try {
    await auth.loginEmploye(matricule.value, pin.value);
    router.push('/pointer');
  } catch (err) {
    error.value = err.message;
    pin.value = '';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="card login-card">
      <div class="login-brand">Gestion Employés</div>
      <p class="muted">Hôtel Ohinéné &amp; Cook Africa</p>

      <div v-if="error" class="alert error">{{ error }}</div>

      <template v-if="etape === 'matricule'">
        <p class="numpad-question">Quel est votre matricule ?</p>
        <NumPad v-model="matricule" :max-length="6" @complete="allerAuPin" />
        <button class="btn btn-lg" style="width:100%;margin-top:18px" :disabled="!matricule" @click="allerAuPin">Suivant</button>
      </template>

      <template v-else>
        <p class="numpad-question">Code PIN de {{ matricule }}</p>
        <NumPad v-model="pin" :max-length="4" masked @complete="valider" />
        <button class="btn btn-lg" style="width:100%;margin-top:18px" :disabled="loading || !pin" @click="valider">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
        <button class="btn btn-secondary" style="width:100%;margin-top:8px" @click="retour">Retour</button>
      </template>

      <router-link to="/login" class="admin-link">Connexion administrateur</router-link>
    </div>
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
  width: 360px;
  text-align: center;
}
.login-brand {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}
.numpad-question {
  font-weight: 600;
  margin: 18px 0 14px;
}
.admin-link {
  display: block;
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
