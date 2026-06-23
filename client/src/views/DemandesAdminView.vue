<script setup>
import { ref, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const demandes = ref([]);
const statutFiltre = ref('en_attente');
const typeFiltre = ref('');
const error = ref('');
const commentaires = ref({});

const TYPE_LABELS = { avance: 'Avance sur salaire', permission: 'Permission', absence: 'Absence', conge: 'Congé exceptionnel' };
const SOUS_TYPE_LABELS = { deces: 'Décès', mariage: 'Mariage', accouchement: 'Accouchement', paternite: 'Paternité' };

async function charger() {
  if (!auth.etablissementActif) return;
  error.value = '';
  try {
    let url = `/api/demandes?etablissement=${auth.etablissementActif}`;
    if (statutFiltre.value) url += `&statut=${statutFiltre.value}`;
    if (typeFiltre.value) url += `&type=${typeFiltre.value}`;
    demandes.value = await api.get(url);
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(charger);
watch([statutFiltre, typeFiltre, () => auth.etablissementActif], charger);

async function traiter(d, statut) {
  try {
    await api.patch(`/api/demandes/${d.id}`, { statut, commentaireAdmin: commentaires.value[d.id] || '' });
    await charger();
  } catch (err) {
    error.value = err.message;
  }
}

async function verser(d) {
  try {
    await api.post(`/api/demandes/${d.id}/verser`);
    await charger();
  } catch (err) {
    error.value = err.message;
  }
}

function detail(d) {
  if (d.type === 'avance') return `${Number(d.montant).toLocaleString('fr-FR')}`;
  if (d.type === 'permission') return `${d.dateDebut} de ${d.heureDebut} à ${d.heureFin}`;
  if (d.type === 'absence') return `${d.dateDebut} → ${d.dateFin}`;
  if (d.type === 'conge') return `${SOUS_TYPE_LABELS[d.sousType] || d.sousType} : ${d.dateDebut} → ${d.dateFin}`;
  return '';
}
</script>

<template>
  <div>
    <h1 class="page-title">Demandes</h1>

    <div class="flex-between" style="margin-bottom:16px">
      <div class="form-group" style="max-width:200px">
        <label>Statut</label>
        <select v-model="statutFiltre">
          <option value="">Tous</option>
          <option value="en_attente">En attente</option>
          <option value="approuvee">Approuvée</option>
          <option value="refusee">Refusée</option>
        </select>
      </div>
      <div class="form-group" style="max-width:220px">
        <label>Type</label>
        <select v-model="typeFiltre">
          <option value="">Tous</option>
          <option v-for="(label, type) in TYPE_LABELS" :key="type" :value="type">{{ label }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>

    <div class="card" v-for="d in demandes" :key="d.id" style="margin-bottom:12px">
      <div class="flex-between">
        <div>
          <strong>{{ d.employeNom }}</strong> — {{ TYPE_LABELS[d.type] }}
          <div class="muted">{{ detail(d) }}</div>
          <div v-if="d.motif" class="muted">Motif : {{ d.motif }}</div>
        </div>
        <span class="badge" :class="d.statut">{{ d.statut.replace('_', ' ') }}</span>
      </div>

      <div v-if="d.statut === 'en_attente'" style="margin-top:12px">
        <input v-model="commentaires[d.id]" placeholder="Commentaire (optionnel)" style="margin-bottom:8px" />
        <button class="btn" @click="traiter(d, 'approuvee')">Approuver</button>
        <button class="btn btn-danger" style="margin-left:8px" @click="traiter(d, 'refusee')">Refuser</button>
      </div>

      <div v-else-if="d.type === 'avance' && d.statut === 'approuvee' && !d.montantVerse" style="margin-top:12px">
        <button class="btn" @click="verser(d)">Marquer comme versée</button>
      </div>

      <div v-else-if="d.type === 'avance' && d.montantVerse" class="muted" style="margin-top:8px">
        Versée — solde restant à déduire : {{ d.soldeRestant?.toLocaleString('fr-FR') }}
      </div>

      <div v-if="d.commentaireAdmin" class="muted" style="margin-top:8px">Commentaire : {{ d.commentaireAdmin }}</div>
    </div>

    <div v-if="!demandes.length" class="card muted">Aucune demande</div>
  </div>
</template>
