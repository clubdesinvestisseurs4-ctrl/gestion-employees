<script setup>
import { ref, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const periode = ref(new Date().toISOString().slice(0, 7));
const fiches = ref([]);
const error = ref('');
const success = ref('');
const generating = ref(false);

async function charger() {
  if (!auth.etablissementActif) return;
  error.value = '';
  try {
    fiches.value = await api.get(`/api/salaires/${auth.etablissementActif}?periode=${periode.value}`);
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(charger);
watch([periode, () => auth.etablissementActif], charger);

async function generer() {
  generating.value = true;
  error.value = ''; success.value = '';
  try {
    const res = await api.post(`/api/salaires/${auth.etablissementActif}/generer?periode=${periode.value}`);
    success.value = res.message;
    await charger();
  } catch (err) {
    error.value = err.message;
  } finally {
    generating.value = false;
  }
}

async function changerStatut(f, statut) {
  try {
    await api.patch(`/api/salaires/${f.id}`, { statut });
    await charger();
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Salaires</h1>

    <div class="flex-between" style="margin-bottom:16px">
      <div class="form-group" style="max-width:200px"><label>Période</label><input v-model="periode" type="month" /></div>
      <button class="btn" :disabled="generating" @click="generer">{{ generating ? 'Génération…' : 'Générer les fiches du mois' }}</button>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="success" class="alert success">{{ success }}</div>

    <div class="card">
      <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Employé</th><th>Heures</th><th>Salaire brut</th><th>Avance déduite</th><th>Net</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="f in fiches" :key="f.id">
            <td>{{ f.employeNom }}</td>
            <td>{{ f.totalHeures }} / {{ f.heuresAttenduesMois }}</td>
            <td>{{ f.salaireBrutCalcule.toLocaleString('fr-FR') }}</td>
            <td>{{ f.avanceDeduite.toLocaleString('fr-FR') }}</td>
            <td><strong>{{ f.salaireNet.toLocaleString('fr-FR') }}</strong></td>
            <td><span class="badge" :class="f.statut">{{ f.statut }}</span></td>
            <td>
              <button v-if="f.statut === 'brouillon'" class="btn btn-outline" style="padding:6px 10px" @click="changerStatut(f, 'validee')">Valider</button>
              <button v-else-if="f.statut === 'validee'" class="btn" style="padding:6px 10px" @click="changerStatut(f, 'payee')">Marquer payée</button>
            </td>
          </tr>
          <tr v-if="!fiches.length"><td colspan="7" class="muted">Aucune fiche pour cette période — cliquez sur "Générer les fiches du mois"</td></tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
