<script setup>
import { ref, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const pointages = ref([]);
const employes = ref([]);
const periode = ref(new Date().toISOString().slice(0, 7));
const employeId = ref('');
const error = ref('');
const editingId = ref(null);
const editArrivee = ref('');
const editDepart = ref('');

async function charger() {
  if (!auth.etablissementActif) return;
  error.value = '';
  try {
    employes.value = await api.get(`/api/employes?etablissement=${auth.etablissementActif}`);
    let url = `/api/pointages?etablissement=${auth.etablissementActif}&periode=${periode.value}`;
    if (employeId.value) url += `&employeId=${employeId.value}`;
    pointages.value = await api.get(url);
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(charger);
watch([periode, employeId, () => auth.etablissementActif], charger);

function startEdit(p) {
  editingId.value = p.id;
  editArrivee.value = p.heureArrivee || '';
  editDepart.value = p.heureDepart || '';
}

async function saveEdit(p) {
  try {
    await api.put(`/api/pointages/${p.id}`, { heureArrivee: editArrivee.value, heureDepart: editDepart.value });
    editingId.value = null;
    await charger();
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Pointages</h1>

    <div class="flex-between" style="margin-bottom:16px">
      <div class="form-group" style="max-width:200px"><label>Période</label><input v-model="periode" type="month" /></div>
      <div class="form-group" style="max-width:240px">
        <label>Employé</label>
        <select v-model="employeId">
          <option value="">Tous</option>
          <option v-for="e in employes" :key="e.id" :value="e.id">{{ e.prenom }} {{ e.nom }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>

    <div class="card">
      <table>
        <thead><tr><th>Date</th><th>Employé</th><th>Arrivée</th><th>Départ</th><th>Heures</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in pointages" :key="p.id">
            <td>{{ p.date }}</td>
            <td>{{ p.employeNom }}</td>
            <td>
              <input v-if="editingId === p.id" v-model="editArrivee" type="time" style="width:110px" />
              <span v-else>{{ p.heureArrivee || '—' }}</span>
            </td>
            <td>
              <input v-if="editingId === p.id" v-model="editDepart" type="time" style="width:110px" />
              <span v-else>{{ p.heureDepart || '—' }}</span>
            </td>
            <td>{{ p.heures ?? '—' }}</td>
            <td><span class="badge" :class="p.statutJour">{{ p.statutJour }}</span></td>
            <td>
              <button v-if="editingId !== p.id" class="btn btn-outline" style="padding:6px 10px" @click="startEdit(p)">Corriger</button>
              <button v-else class="btn" style="padding:6px 10px" @click="saveEdit(p)">Enregistrer</button>
            </td>
          </tr>
          <tr v-if="!pointages.length"><td colspan="7" class="muted">Aucun pointage pour cette période</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
