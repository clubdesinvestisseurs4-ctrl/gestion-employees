<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NavIcon from '../components/NavIcon.vue';

const auth = useAuthStore();
const router = useRouter();

const navEmploye = [
  { to: '/pointer', label: 'Pointer', icon: 'camera' },
  { to: '/mes-heures', label: 'Mes heures & salaire', icon: 'wallet' },
  { to: '/mes-demandes', label: 'Mes demandes', icon: 'clipboard' },
  { to: '/profil', label: 'Profil', icon: 'user' },
];

const navAdmin = [
  { to: '/admin', label: 'Tableau de bord', icon: 'chart' },
  { to: '/admin/employes', label: 'Employés', icon: 'users' },
  { to: '/admin/pointages', label: 'Pointages', icon: 'clock' },
  { to: '/admin/demandes', label: 'Demandes', icon: 'inbox' },
  { to: '/admin/salaires', label: 'Salaires', icon: 'wallet' },
  { to: '/admin/parametres-pointage', label: 'Paramètres pointage', icon: 'settings' },
];

const nav = computed(() => (auth.isAdmin ? navAdmin : navEmploye));

const etablissementLabels = { ohinene: 'Hôtel Ohinéné', cookafrica: 'Cook Africa' };

function selectEtablissement(e) {
  auth.setEtablissementActif(e.target.value);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">Gestion Employés</div>
      <nav>
        <router-link v-for="item in nav" :key="item.to" :to="item.to" class="nav-link" :aria-label="item.label">
          <NavIcon :name="item.icon" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-user">
        <div class="user-name">{{ auth.user?.prenom }} {{ auth.user?.nom }}</div>
        <div class="muted">{{ auth.user?.role === 'admin' ? 'Administrateur' : auth.user?.matricule }}</div>
        <button class="btn btn-outline" style="margin-top:10px;width:100%" @click="logout">Déconnexion</button>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="topbar">
        <select v-if="auth.etablissements.length > 1" :value="auth.etablissementActif" class="etab-select" @change="selectEtablissement">
          <option v-for="e in auth.etablissements" :key="e" :value="e">{{ etablissementLabels[e] || e }}</option>
        </select>
        <span v-else-if="auth.etablissements.length === 1" class="muted">
          {{ etablissementLabels[auth.etablissements[0]] || auth.etablissements[0] }}
        </span>
      </header>
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 240px;
  background: var(--bg-sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  padding: 18px 14px;
}
.sidebar-brand {
  font-weight: 700;
  font-size: 17px;
  margin-bottom: 24px;
  padding: 0 8px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #d7e6dc;
  font-size: 14px;
  margin-bottom: 4px;
  transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.nav-link:hover, .nav-link.router-link-active {
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.nav-link:active { transform: scale(0.96); }
.nav-link :deep(.nav-icon) { transition: transform 0.18s ease; }
.nav-link.router-link-active :deep(.nav-icon) { transform: scale(1.12); }
.sidebar-user {
  margin-top: auto;
  padding: 12px 8px;
  border-top: 1px solid rgba(255,255,255,0.15);
}
.sidebar-user .user-name { font-weight: 600; }
.sidebar-user .muted { color: #a9bdb1; }

.main-wrapper {
  margin-left: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.etab-select {
  width: auto;
  font-weight: 600;
}
.content {
  padding: 24px;
  flex: 1;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    flex-direction: row;
    overflow-x: auto;
    padding: 6px 4px;
    padding-bottom: calc(6px + env(safe-area-inset-bottom));
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }
  .sidebar-brand, .sidebar-user { display: none; }
  nav { display: flex; width: 100%; }
  .nav-link {
    flex: 1;
    justify-content: center;
    padding: 10px 4px;
    border-radius: 12px;
    margin-bottom: 0;
  }
  .nav-link .nav-label { display: none; }
  .nav-link :deep(.nav-icon) {
    width: 25px;
    height: 25px;
  }
  .main-wrapper { margin-left: 0; }
  .content { padding-bottom: 72px; }
}
</style>
