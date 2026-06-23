<script setup>
import { ref } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const ancienMotDePasse = ref('');
const nouveauMotDePasse = ref('');
const error = ref('');
const success = ref('');
const submitting = ref(false);

async function changerMotDePasse() {
  error.value = '';
  success.value = '';
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
</script>

<template>
  <div>
    <h1 class="page-title">Mon profil</h1>

    <div class="card">
      <p><strong>Matricule :</strong> {{ auth.user?.matricule }}</p>
      <p><strong>Nom :</strong> {{ auth.user?.prenom }} {{ auth.user?.nom }}</p>
      <p><strong>Identifiant :</strong> {{ auth.user?.username }}</p>
      <p><strong>Poste :</strong> {{ auth.user?.poste || '—' }}</p>
      <p><strong>Téléphone :</strong> {{ auth.user?.telephone || '—' }}</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Changer mon mot de passe</h3>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>
      <form @submit.prevent="changerMotDePasse">
        <div class="form-group"><label>Mot de passe actuel</label><input v-model="ancienMotDePasse" type="password" required /></div>
        <div class="form-group"><label>Nouveau mot de passe</label><input v-model="nouveauMotDePasse" type="password" minlength="6" required /></div>
        <button class="btn" type="submit" :disabled="submitting">{{ submitting ? 'Mise à jour…' : 'Mettre à jour' }}</button>
      </form>
    </div>
  </div>
</template>
