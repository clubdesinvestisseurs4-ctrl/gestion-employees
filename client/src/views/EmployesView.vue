<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const employes = ref([]);
const error = ref('');
const success = ref('');
const submitting = ref(false);
const editingId = ref(null);
const resetPasswordId = ref(null);
const nouveauMotDePasse = ref('');

const ETABLISSEMENTS = [
  { id: 'ohinene', label: 'Hôtel Ohinéné' },
  { id: 'cookafrica', label: 'Cook Africa' },
];

const emptyForm = () => ({
  nom: '', prenom: '', username: '', password: '',
  poste: '', telephone: '', salaireMensuel: '', heuresAttenduesMois: 208, heuresParJour: 8,
  etablissementsAccess: [],
});
const form = reactive(emptyForm());

async function charger() {
  if (!auth.etablissementActif) return;
  employes.value = await api.get(`/api/employes?etablissement=${auth.etablissementActif}`);
}
onMounted(charger);
watch(() => auth.etablissementActif, charger);

function startEdit(e) {
  editingId.value = e.id;
  Object.assign(form, {
    nom: e.nom, prenom: e.prenom, username: e.username, password: '',
    poste: e.poste, telephone: e.telephone, salaireMensuel: e.salaireMensuel,
    heuresAttenduesMois: e.heuresAttenduesMois, heuresParJour: e.heuresParJour,
    etablissementsAccess: [...(e.etablissementsAccess || [])],
  });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

async function submit() {
  error.value = ''; success.value = '';
  submitting.value = true;
  try {
    if (editingId.value) {
      await api.put(`/api/employes/${editingId.value}`, {
        nom: form.nom, prenom: form.prenom, poste: form.poste, telephone: form.telephone,
        salaireMensuel: Number(form.salaireMensuel), heuresAttenduesMois: Number(form.heuresAttenduesMois),
        heuresParJour: Number(form.heuresParJour), etablissementsAccess: form.etablissementsAccess,
      });
      success.value = 'Employé mis à jour';
    } else {
      await api.post('/api/employes', {
        ...form,
        salaireMensuel: Number(form.salaireMensuel),
        heuresAttenduesMois: Number(form.heuresAttenduesMois),
        heuresParJour: Number(form.heuresParJour),
      });
      success.value = 'Employé créé';
    }
    cancelEdit();
    await charger();
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function desactiver(e) {
  if (!confirm(`Désactiver ${e.prenom} ${e.nom} ?`)) return;
  await api.delete(`/api/employes/${e.id}`);
  await charger();
}

async function reinitialiser(e) {
  if (!nouveauMotDePasse.value || nouveauMotDePasse.value.length < 6) {
    error.value = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
    return;
  }
  await api.post(`/api/employes/${e.id}/reinitialiser-mot-de-passe`, { nouveauMotDePasse: nouveauMotDePasse.value });
  success.value = `Mot de passe de ${e.prenom} réinitialisé`;
  resetPasswordId.value = null;
  nouveauMotDePasse.value = '';
}
</script>

<template>
  <div>
    <h1 class="page-title">Employés</h1>

    <div class="card">
      <h3 style="margin-top:0">{{ editingId ? 'Modifier' : 'Nouvel employé' }}</h3>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <form @submit.prevent="submit">
        <div class="flex-between">
          <div class="form-group" style="flex:1"><label>Nom</label><input v-model="form.nom" required /></div>
          <div class="form-group" style="flex:1"><label>Prénom</label><input v-model="form.prenom" required /></div>
        </div>
        <div class="flex-between">
          <div class="form-group" style="flex:1">
            <label>Identifiant</label>
            <input v-model="form.username" :disabled="!!editingId" required />
          </div>
          <div class="form-group" style="flex:1" v-if="!editingId">
            <label>Mot de passe initial</label>
            <input v-model="form.password" type="password" minlength="6" required />
          </div>
        </div>
        <div class="flex-between">
          <div class="form-group" style="flex:1"><label>Poste</label><input v-model="form.poste" /></div>
          <div class="form-group" style="flex:1"><label>Téléphone</label><input v-model="form.telephone" /></div>
        </div>
        <div class="flex-between">
          <div class="form-group" style="flex:1"><label>Salaire mensuel</label><input v-model="form.salaireMensuel" type="number" min="1" required /></div>
          <div class="form-group" style="flex:1"><label>Heures attendues / mois</label><input v-model="form.heuresAttenduesMois" type="number" min="1" /></div>
          <div class="form-group" style="flex:1"><label>Heures / jour</label><input v-model="form.heuresParJour" type="number" min="1" /></div>
        </div>
        <div class="form-group">
          <label>Établissement(s)</label>
          <label v-for="e in ETABLISSEMENTS" :key="e.id" style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;font-weight:normal">
            <input type="checkbox" :value="e.id" v-model="form.etablissementsAccess" style="width:auto" /> {{ e.label }}
          </label>
        </div>

        <button class="btn" type="submit" :disabled="submitting">{{ submitting ? 'Enregistrement…' : (editingId ? 'Mettre à jour' : 'Créer') }}</button>
        <button v-if="editingId" type="button" class="btn btn-secondary" style="margin-left:8px" @click="cancelEdit">Annuler</button>
      </form>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>Matricule</th><th>Nom</th><th>Poste</th><th>Salaire mensuel</th><th>Établissements</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in employes" :key="e.id">
            <td>{{ e.matricule }}</td>
            <td>{{ e.prenom }} {{ e.nom }}</td>
            <td>{{ e.poste || '—' }}</td>
            <td>{{ e.salaireMensuel?.toLocaleString('fr-FR') }}</td>
            <td>{{ (e.etablissementsAccess || []).join(', ') }}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-outline" style="padding:6px 10px" @click="startEdit(e)">Modifier</button>
              <button class="btn btn-outline" style="padding:6px 10px;margin-left:6px" @click="resetPasswordId = resetPasswordId === e.id ? null : e.id">Mot de passe</button>
              <button class="btn btn-danger" style="padding:6px 10px;margin-left:6px" @click="desactiver(e)">Désactiver</button>
              <div v-if="resetPasswordId === e.id" style="margin-top:8px;display:flex;gap:6px">
                <input v-model="nouveauMotDePasse" type="password" placeholder="Nouveau mot de passe" minlength="6" />
                <button class="btn" style="padding:6px 10px" @click="reinitialiser(e)">OK</button>
              </div>
            </td>
          </tr>
          <tr v-if="!employes.length"><td colspan="6" class="muted">Aucun employé</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
