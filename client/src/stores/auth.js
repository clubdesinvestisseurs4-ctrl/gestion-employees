import { defineStore } from 'pinia';
import { api } from '../api/client';
import { saveSession, clearSession, getToken, getStoredUser, getTokenExpiryMs, forceLogout } from '../utils/session';

let expiryTimer = null;

function clearExpiryTimer() {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: getStoredUser(),
    etablissementActif: localStorage.getItem('ge_etablissement') || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    etablissements: (state) => state.user?.etablissementsAccess || [],
  },

  actions: {
    async login(username, password) {
      const data = await api.post('/api/auth/login', { username, password });
      this.token = data.token;
      this.user = data.user;
      saveSession(data.token, data.user);
      if (!this.etablissementActif && data.user.etablissementsAccess?.length) {
        this.setEtablissementActif(data.user.etablissementsAccess[0]);
      }
      this.scheduleExpiry();
    },

    logout() {
      clearExpiryTimer();
      this.token = null;
      this.user = null;
      clearSession();
    },

    setEtablissementActif(etablissement) {
      this.etablissementActif = etablissement;
      localStorage.setItem('ge_etablissement', etablissement);
    },

    scheduleExpiry() {
      clearExpiryTimer();
      if (!this.token) return;
      const expiryMs = getTokenExpiryMs(this.token);
      if (!expiryMs) return;
      const delay = expiryMs - Date.now();
      if (delay <= 0) {
        forceLogout();
        return;
      }
      expiryTimer = setTimeout(() => forceLogout(), delay);
    },

    init() {
      if (this.token) this.scheduleExpiry();
    },
  },
});
