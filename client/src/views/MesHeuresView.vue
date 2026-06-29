<script setup>
import { ref, onMounted, watch } from 'vue';
import { api } from '../api/client';

const periode = ref(new Date().toISOString().slice(0, 7));
const estimation = ref(null);
const pointages = ref([]);
const error = ref('');

async function charger() {
  error.value = '';
  try {
    estimation.value = await api.get(`/api/salaires/estimation?periode=${periode.value}`);
    pointages.value = await api.get(`/api/pointages?periode=${periode.value}`);
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(charger);
watch(periode, charger);
</script>

<template>
  <div>
    <h1 class="page-title">Mes heures &amp; salaire</h1>

    <div class="form-group" style="max-width:220px">
      <label>Période</label>
      <input v-model="periode" type="month" />
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>

    <div v-if="estimation" class="grid-kpi">
      <div class="kpi">
        <div class="kpi-value">{{ estimation.heuresPointees }} h</div>
        <div class="kpi-label">Heures pointées</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ estimation.heuresCongesPayees }} h</div>
        <div class="kpi-label">Congés / permissions payés</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ estimation.totalHeures }} / {{ estimation.heuresAttenduesMois }} h</div>
        <div class="kpi-label">Total vs heures attendues</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ estimation.salaireNet.toLocaleString('fr-FR') }}</div>
        <div class="kpi-label">Salaire net estimé (avance déduite : {{ estimation.avanceDeduite.toLocaleString('fr-FR') }})</div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Détail des pointages</h3>
      <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Arrivée</th><th>Départ</th><th>Heures</th><th>Statut</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in pointages" :key="p.id">
            <td>{{ p.date }}</td>
            <td>{{ p.heureArrivee || '—' }}</td>
            <td>{{ p.heureDepart || '—' }}</td>
            <td>{{ p.heures ?? '—' }}</td>
            <td><span class="badge" :class="p.statutJour">{{ p.statutJour }}</span></td>
          </tr>
          <tr v-if="!pointages.length"><td colspan="5" class="muted">Aucun pointage pour cette période</td></tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
