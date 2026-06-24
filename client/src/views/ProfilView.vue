<script setup>
import { ref } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import NumPad from '../components/NumPad.vue';

const auth = useAuthStore();
const error = ref('');
const success = ref('');
const submitting = ref(false);

// Admin : changement de mot de passe classique
const ancienMotDePasse = ref('');
const nouveauMotDePasse = ref('');

async function changerMotDePasse() {
  error.value = ''; success.value = '';
  submitting.value = true;
  try {
    await api.post('/api/auth/changer-mot-de-passe', {
      ancienMotDePasse: ancienMotDePasse.value,
      nouveauMotDePasse: nouveauMotDePasse.value,
    });
    success.value = 'Mot de passe mis à jour';
    ancienMotDePasse.value = '';
    nouveauMotDePasse.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

// Employé : changement de PIN via pavé numérique (ancien PIN puis nouveau PIN)
const etapePin = ref('ancien'); // 'ancien' | 'nouveau'
const ancienPin = ref('');
const nouveauPin = ref('');

function allerAuNouveauPin() {
  etapePin.value = 'nouveau';
}

async function changerPin() {
  error.value = ''; success.value = '';
  submitting.value = true;
  try {
    await api.post('/api/auth/changer-pin', { ancienPin: ancienPin.value, nouveauPin: nouveauPin.value });
    success.value = 'Code PIN mis à jour';
    ancienPin.value = '';
    nouveauPin.value = '';
    etapePin.value = 'ancien';
  } catch (err) {
    error.value = err.message;
    ancienPin.value = '';
    nouveauPin.value = '';
    etapePin.value = 'ancien';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Mon profil</h1>

    <div class="card">
      <p><strong>Matricule :</strong> {{ auth.user?.matricule }}</p>
      <p><strong>Nom :</strong> {{ auth.user?.prenom }} {{ auth.user?.nom }}</p>
      <p v-if="auth.user?.poste"><strong>Poste :</strong> {{ auth.user?.poste }}</p>
      <p v-if="auth.user?.telephone"><strong>Téléphone :</strong> {{ auth.user?.telephone }}</p>
    </div>

    <div class="card" style="text-align:center">
      <div v-if="error" class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <template v-if="auth.isAdmin">
        <h3 style="margin-top:0">Changer mon mot de passe</h3>
        <form @submit.prevent="changerMotDePasse" style="text-align:left">
          <div class="form-group"><label>Mot de passe actuel</label><input v-model="ancienMotDePasse" type="password" required /></div>
          <div class="form-group"><label>Nouveau mot de passe</label><input v-model="nouveauMotDePasse" type="password" minlength="6" required /></div>
          <button class="btn" type="submit" :disabled="submitting">{{ submitting ? 'Mise à jour…' : 'Mettre à jour' }}</button>
        </form>
      </template>

      <template v-else>
        <h3 style="margin-top:0">Changer mon code PIN</h3>
        <template v-if="etapePin === 'ancien'">
          <p class="muted">Code PIN actuel</p>
          <NumPad v-model="ancienPin" :max-length="4" masked @complete="allerAuNouveauPin" />
        </template>
        <template v-else>
          <p class="muted">Nouveau code PIN</p>
          <NumPad v-model="nouveauPin" :max-length="4" masked @complete="changerPin" />
        </template>
      </template>
    </div>
  </div>
</template>
