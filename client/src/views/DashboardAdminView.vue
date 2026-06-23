<script setup>
import { ref, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const employes = ref([]);
const demandesEnAttente = ref([]);
const presentsAujourdhui = ref(0);
const masseSalariale = ref(0);
const loading = ref(false);
const error = ref('');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function charger() {
  const etab = auth.etablissementActif;
  if (!etab) return;
  loading.value = true;
  error.value = '';
  try {
    employes.value = await api.get(`/api/employes?etablissement=${etab}`);
    demandesEnAttente.value = await api.get(`/api/demandes?etablissement=${etab}&statut=en_attente`);

    const periode = todayStr().slice(0, 7);
    const pointages = await api.get(`/api/pointages?etablissement=${etab}&periode=${periode}`);
    presentsAujourdhui.value = pointages.filter((p) => p.date === todayStr() && p.heureArrivee).length;

    let total = 0;
    for (const e of employes.value) {
      const est = await api.get(`/api/salaires/estimation?employeId=${e.id}&periode=${periode}`);
      total += est.salaireNet;
    }
    masseSalariale.value = Math.round(total);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(charger);
watch(() => auth.etablissementActif, charger);

const TYPE_LABELS = { avance: 'Avance', permission: 'Permission', absence: 'Absence', conge: 'Congé' };
function compterParType(type) {
  return demandesEnAttente.value.filter((d) => d.type === type).length;
}
</script>

<template>
  <div>
    <h1 class="page-title">Tableau de bord</h1>
    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="loading" class="muted">Chargement…</div>

    <div class="grid-kpi">
      <div class="kpi">
        <div class="kpi-value">{{ employes.length }}</div>
        <div class="kpi-label">Employés actifs</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ presentsAujourdhui }} / {{ employes.length }}</div>
        <div class="kpi-label">Présents aujourd'hui</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ demandesEnAttente.length }}</div>
        <div class="kpi-label">Demandes en attente</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ masseSalariale.toLocaleString('fr-FR') }}</div>
        <div class="kpi-label">Masse salariale estimée (mois en cours)</div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Demandes en attente par type</h3>
      <div class="grid-kpi">
        <div v-for="(label, type) in TYPE_LABELS" :key="type" class="kpi">
          <div class="kpi-value">{{ compterParType(type) }}</div>
          <div class="kpi-label">{{ label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
