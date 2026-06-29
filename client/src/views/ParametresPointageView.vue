<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const error = ref('');
const success = ref('');
const qrImage = ref('');
const nouvelleIp = ref('');

const config = reactive({ allowedIps: [], gpsLat: null, gpsLng: null, gpsRadiusMeters: 150 });
const gpsAccuracy = ref(null);
const gpsCapturing = ref(false);

async function charger() {
  if (!auth.etablissementActif) return;
  error.value = '';
  try {
    const data = await api.get(`/api/sites-config/${auth.etablissementActif}`);
    Object.assign(config, {
      allowedIps: data.allowedIps || [],
      gpsLat: data.gpsLat,
      gpsLng: data.gpsLng,
      gpsRadiusMeters: data.gpsRadiusMeters || 150,
    });
    if (data.qrToken) {
      const img = await api.get(`/api/sites-config/${auth.etablissementActif}/qr-image`);
      qrImage.value = img.qrImage;
    } else {
      qrImage.value = '';
    }
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(charger);
watch(() => auth.etablissementActif, charger);

async function regenererQr() {
  if (!confirm('Régénérer le QR invalide l\'ancien (à réimprimer). Continuer ?')) return;
  const res = await api.post(`/api/sites-config/${auth.etablissementActif}/regenerer-qr`);
  qrImage.value = res.qrImage;
  success.value = 'QR régénéré — pensez à réimprimer et remplacer celui affiché à l\'entrée';
}

async function utiliserMonIp() {
  const res = await api.get('/api/sites-config/ip-actuelle');
  nouvelleIp.value = res.ip;
}

function ajouterIp() {
  if (nouvelleIp.value && !config.allowedIps.includes(nouvelleIp.value)) {
    config.allowedIps.push(nouvelleIp.value);
    nouvelleIp.value = '';
  }
}

function retirerIp(ip) {
  config.allowedIps = config.allowedIps.filter((i) => i !== ip);
}

function utiliserMaPosition() {
  error.value = '';
  gpsAccuracy.value = null;
  gpsCapturing.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      config.gpsLat = pos.coords.latitude;
      config.gpsLng = pos.coords.longitude;
      gpsAccuracy.value = Math.round(pos.coords.accuracy);
      gpsCapturing.value = false;
    },
    (err) => {
      error.value = 'Impossible d\'obtenir votre position : ' + err.message;
      gpsCapturing.value = false;
    },
    { enableHighAccuracy: true, timeout: 20000 }
  );
}

async function enregistrer() {
  error.value = ''; success.value = '';
  try {
    await api.put(`/api/sites-config/${auth.etablissementActif}`, config);
    success.value = 'Paramètres enregistrés';
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Paramètres du pointage</h1>
    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="success" class="alert success">{{ success }}</div>

    <div class="card">
      <h3 style="margin-top:0">QR code à afficher à l'entrée</h3>
      <p class="muted">Imprimez ce QR et affichez-le à l'entrée du site. Le scanner seul ne suffit pas : l'employé doit aussi être connecté au Wi-Fi de l'entreprise et physiquement sur le site (GPS).</p>
      <div v-if="qrImage" style="text-align:center">
        <img :src="qrImage" alt="QR pointage" style="width:240px" />
      </div>
      <div v-else class="muted">Aucun QR généré pour le moment.</div>
      <button class="btn" style="margin-top:12px" @click="regenererQr">{{ qrImage ? 'Régénérer le QR' : 'Générer le QR' }}</button>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Adresses IP autorisées (Wi-Fi de l'entreprise)</h3>
      <p class="muted">
        Un navigateur ne peut pas lire le nom du réseau Wi-Fi. Le contrôle se fait via l'adresse IP publique
        de la connexion internet du site, qui doit être statique. Demandez à un employé connecté au bon
        Wi-Fi de cliquer sur "Utiliser mon IP actuelle" depuis cette page, ou ajoutez-la manuellement.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input v-model="nouvelleIp" placeholder="ex: 102.45.12.8" />
        <button class="btn btn-outline" @click="utiliserMonIp">Utiliser mon IP actuelle</button>
        <button class="btn" @click="ajouterIp">Ajouter</button>
      </div>
      <ul>
        <li v-for="ip in config.allowedIps" :key="ip" style="margin-bottom:6px">
          {{ ip }} <button class="btn btn-danger" style="padding:4px 8px;margin-left:8px" @click="retirerIp(ip)">Retirer</button>
        </li>
      </ul>
      <p v-if="!config.allowedIps.length" class="muted">Aucune IP configurée — le pointage sera refusé pour tous tant qu'aucune IP n'est ajoutée.</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Position GPS du site</h3>
      <p class="muted">
        Pour un lieu fixe (hôtel, restaurant), le plus fiable est de chercher l'adresse sur Google Maps sur un
        ordinateur, de faire un clic droit sur le bâtiment exact et de copier les coordonnées affichées, plutôt
        que de dépendre de la géolocalisation du téléphone (qui peut être imprécise en intérieur).
      </p>
      <button class="btn btn-outline" style="margin-bottom:8px" :disabled="gpsCapturing" @click="utiliserMaPosition">
        {{ gpsCapturing ? 'Localisation en cours…' : 'Utiliser ma position actuelle' }}
      </button>
      <p v-if="gpsAccuracy !== null" :class="gpsAccuracy > 100 ? 'alert error' : 'muted'" style="margin-bottom:12px">
        Précision estimée de cette capture : ±{{ gpsAccuracy }} m
        <span v-if="gpsAccuracy > 100">— trop imprécis pour servir de référence fiable. Sortez à l'extérieur ou à proximité d'une fenêtre et réessayez, ou saisissez les coordonnées manuellement via Google Maps.</span>
      </p>
      <div class="flex-between">
        <div class="form-group" style="flex:1"><label>Latitude</label><input v-model="config.gpsLat" type="number" step="any" /></div>
        <div class="form-group" style="flex:1"><label>Longitude</label><input v-model="config.gpsLng" type="number" step="any" /></div>
        <div class="form-group" style="flex:1"><label>Rayon toléré (m)</label><input v-model="config.gpsRadiusMeters" type="number" min="10" /></div>
      </div>
    </div>

    <button class="btn" @click="enregistrer">Enregistrer les paramètres</button>
  </div>
</template>
