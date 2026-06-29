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
const resetPinId = ref(null);
const nouveauPin = ref('');

const ETABLISSEMENTS = [
  { id: 'ohinene', label: 'Hôtel Ohinéné' },
  { id: 'cookafrica', label: 'Cook Africa' },
];

const emptyForm = () => ({
  matricule: '', nom: '', prenom: '', pin: '',
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
    matricule: e.matricule, nom: e.nom, prenom: e.prenom, pin: '',
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
        matricule: form.matricule, nom: form.nom, prenom: form.prenom, poste: form.poste, telephone: form.telephone,
        salaireMensuel: Number(form.salaireMensuel), heuresAttenduesMois: Number(form.heuresAttenduesMois),
        heuresParJour: Number(form.heuresParJour), etablissementsAccess: form.etablissementsAccess,
      });
      success.value = 'Employé mis à jour';
      cancelEdit();
    } else {
      const cree = await api.post('/api/employes', {
        ...form,
        salaireMensuel: Number(form.salaireMensuel),
        heuresAttenduesMois: Number(form.heuresAttenduesMois),
        heuresParJour: Number(form.heuresParJour),
      });
      success.value = `Employé créé — code de connexion à communiquer à l'employé : ${cree.codeConnexion}`;
      cancelEdit();
    }
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
  if (!/^\d{4}$/.test(nouveauPin.value)) {
    error.value = 'Le PIN doit contenir exactement 4 chiffres';
    return;
  }
  await api.post(`/api/employes/${e.id}/reinitialiser-pin`, { nouveauPin: nouveauPin.value });
  success.value = `PIN de ${e.prenom} réinitialisé : ${nouveauPin.value}`;
  resetPinId.value = null;
  nouveauPin.value = '';
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
          <div class="form-group" style="flex:1"><label>Matricule (existant)</label><input v-model="form.matricule" placeholder="ex: EMP-001" required /></div>
        </div>
        <div class="flex-between">
          <div class="form-group" style="flex:1"><label>Nom</label><input v-model="form.nom" required /></div>
          <div class="form-group" style="flex:1"><label>Prénom</label><input v-model="form.prenom" required /></div>
        </div>
        <p v-if="!editingId" class="muted" style="margin-top:-6px">
          Un code de connexion numérique sera généré automatiquement (distinct du matricule) — c'est lui que l'employé utilisera pour se connecter à l'app, avec le PIN ci-dessous.
        </p>
        <div class="form-group" v-if="!editingId" style="max-width:200px">
          <label>Code PIN initial (4 chiffres)</label>
          <input v-model="form.pin" inputmode="numeric" pattern="\d{4}" maxlength="4" placeholder="ex: 1234" required />
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
      <div class="table-wrap">
      <table>
        <thead><tr><th>Matricule</th><th>Code connexion</th><th>Nom</th><th>Poste</th><th>Salaire mensuel</th><th>Établissements</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in employes" :key="e.id">
            <td>{{ e.matricule }}</td>
            <td><strong style="font-size:16px">{{ e.codeConnexion }}</strong></td>
            <td>{{ e.prenom }} {{ e.nom }}</td>
            <td>{{ e.poste || '—' }}</td>
            <td>{{ e.salaireMensuel?.toLocaleString('fr-FR') }}</td>
            <td>{{ (e.etablissementsAccess || []).join(', ') }}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-outline" style="padding:6px 10px" @click="startEdit(e)">Modifier</button>
              <button class="btn btn-outline" style="padding:6px 10px;margin-left:6px" @click="resetPinId = resetPinId === e.id ? null : e.id">PIN</button>
              <button class="btn btn-danger" style="padding:6px 10px;margin-left:6px" @click="desactiver(e)">Désactiver</button>
              <div v-if="resetPinId === e.id" style="margin-top:8px;display:flex;gap:6px">
                <input v-model="nouveauPin" inputmode="numeric" pattern="\d{4}" maxlength="4" placeholder="Nouveau PIN" style="width:110px" />
                <button class="btn" style="padding:6px 10px" @click="reinitialiser(e)">OK</button>
              </div>
            </td>
          </tr>
          <tr v-if="!employes.length"><td colspan="7" class="muted">Aucun employé</td></tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
