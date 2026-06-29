<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const demandes = ref([]);
const error = ref('');
const success = ref('');
const submitting = ref(false);

const TYPE_LABELS = { avance: 'Avance sur salaire', permission: 'Permission', absence: 'Absence', conge: 'Congé exceptionnel' };
const SOUS_TYPE_LABELS = { deces: 'Décès', mariage: 'Mariage', accouchement: 'Accouchement', paternite: 'Paternité' };

const form = reactive({
  type: 'avance',
  montant: '',
  motif: '',
  dateDebut: '',
  dateFin: '',
  heureDebut: '',
  heureFin: '',
  sousType: 'deces',
});

async function charger() {
  demandes.value = await api.get('/api/demandes/moi');
}

onMounted(charger);

function resetForm() {
  form.montant = '';
  form.motif = '';
  form.dateDebut = '';
  form.dateFin = '';
  form.heureDebut = '';
  form.heureFin = '';
  form.sousType = 'deces';
}

async function submit() {
  error.value = '';
  success.value = '';
  submitting.value = true;
  try {
    const payload = { type: form.type, etablissement: auth.etablissementActif || auth.etablissements[0] };
    if (form.type === 'avance') {
      payload.montant = Number(form.montant);
      payload.motif = form.motif;
    } else if (form.type === 'permission') {
      payload.dateDebut = form.dateDebut;
      payload.heureDebut = form.heureDebut;
      payload.heureFin = form.heureFin;
      payload.motif = form.motif;
    } else if (form.type === 'absence') {
      payload.dateDebut = form.dateDebut;
      payload.dateFin = form.dateFin;
      payload.motif = form.motif;
    } else if (form.type === 'conge') {
      payload.sousType = form.sousType;
      payload.dateDebut = form.dateDebut;
      payload.dateFin = form.dateFin;
      payload.motif = form.motif;
    }

    await api.post('/api/demandes', payload);
    success.value = 'Demande envoyée';
    resetForm();
    await charger();
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

function detail(d) {
  if (d.type === 'avance') return `${Number(d.montant).toLocaleString('fr-FR')} (solde restant : ${d.soldeRestant ?? d.montant})`;
  if (d.type === 'permission') return `${d.dateDebut} de ${d.heureDebut} à ${d.heureFin}`;
  if (d.type === 'absence') return `${d.dateDebut} → ${d.dateFin}`;
  if (d.type === 'conge') return `${SOUS_TYPE_LABELS[d.sousType] || d.sousType} : ${d.dateDebut} → ${d.dateFin}`;
  return '';
}
</script>

<template>
  <div>
    <h1 class="page-title">Mes demandes</h1>

    <div class="card">
      <h3 style="margin-top:0">Nouvelle demande</h3>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Type de demande</label>
          <select v-model="form.type">
            <option value="avance">Avance sur salaire</option>
            <option value="permission">Permission</option>
            <option value="absence">Absence</option>
            <option value="conge">Congé exceptionnel</option>
          </select>
        </div>

        <template v-if="form.type === 'avance'">
          <div class="form-group"><label>Montant</label><input v-model="form.montant" type="number" min="1" required /></div>
          <div class="form-group"><label>Motif</label><textarea v-model="form.motif" rows="2"></textarea></div>
        </template>

        <template v-else-if="form.type === 'permission'">
          <div class="form-group"><label>Date</label><input v-model="form.dateDebut" type="date" required /></div>
          <div class="form-group"><label>Heure de début</label><input v-model="form.heureDebut" type="time" required /></div>
          <div class="form-group"><label>Heure de fin</label><input v-model="form.heureFin" type="time" required /></div>
          <div class="form-group"><label>Motif</label><textarea v-model="form.motif" rows="2"></textarea></div>
        </template>

        <template v-else-if="form.type === 'absence'">
          <div class="form-group"><label>Du</label><input v-model="form.dateDebut" type="date" required /></div>
          <div class="form-group"><label>Au</label><input v-model="form.dateFin" type="date" required /></div>
          <div class="form-group"><label>Motif</label><textarea v-model="form.motif" rows="2"></textarea></div>
        </template>

        <template v-else-if="form.type === 'conge'">
          <div class="form-group">
            <label>Motif du congé</label>
            <select v-model="form.sousType">
              <option value="deces">Décès</option>
              <option value="mariage">Mariage</option>
              <option value="accouchement">Accouchement</option>
              <option value="paternite">Paternité</option>
            </select>
          </div>
          <div class="form-group"><label>Du</label><input v-model="form.dateDebut" type="date" required /></div>
          <div class="form-group"><label>Au</label><input v-model="form.dateFin" type="date" required /></div>
        </template>

        <button class="btn" type="submit" :disabled="submitting">{{ submitting ? 'Envoi…' : 'Envoyer la demande' }}</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Historique</h3>
      <div class="table-wrap">
      <table>
        <thead><tr><th>Type</th><th>Détail</th><th>Statut</th><th>Commentaire admin</th></tr></thead>
        <tbody>
          <tr v-for="d in demandes" :key="d.id">
            <td>{{ TYPE_LABELS[d.type] }}</td>
            <td>{{ detail(d) }}</td>
            <td><span class="badge" :class="d.statut">{{ d.statut.replace('_', ' ') }}</span></td>
            <td class="muted">{{ d.commentaireAdmin || '—' }}</td>
          </tr>
          <tr v-if="!demandes.length"><td colspan="4" class="muted">Aucune demande</td></tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
