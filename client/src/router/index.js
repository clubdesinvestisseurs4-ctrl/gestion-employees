import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/connexion', name: 'connexion-employe', component: () => import('../views/LoginEmployeView.vue'), meta: { public: true } },

  { path: '/', redirect: '/pointer' },
  { path: '/pointer', name: 'pointer', component: () => import('../views/PointerView.vue') },
  { path: '/mes-heures', name: 'mes-heures', component: () => import('../views/MesHeuresView.vue') },
  { path: '/mes-demandes', name: 'mes-demandes', component: () => import('../views/MesDemandesView.vue') },
  { path: '/profil', name: 'profil', component: () => import('../views/ProfilView.vue') },

  { path: '/admin', name: 'admin-dashboard', component: () => import('../views/DashboardAdminView.vue'), meta: { adminOnly: true } },
  { path: '/admin/employes', name: 'admin-employes', component: () => import('../views/EmployesView.vue'), meta: { adminOnly: true } },
  { path: '/admin/pointages', name: 'admin-pointages', component: () => import('../views/PointagesAdminView.vue'), meta: { adminOnly: true } },
  { path: '/admin/demandes', name: 'admin-demandes', component: () => import('../views/DemandesAdminView.vue'), meta: { adminOnly: true } },
  { path: '/admin/salaires', name: 'admin-salaires', component: () => import('../views/SalairesView.vue'), meta: { adminOnly: true } },
  { path: '/admin/parametres-pointage', name: 'admin-parametres', component: () => import('../views/ParametresPointageView.vue'), meta: { adminOnly: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'connexion-employe' };
  }
  if ((to.name === 'login' || to.name === 'connexion-employe') && auth.isAuthenticated) {
    return { name: auth.isAdmin ? 'admin-dashboard' : 'pointer' };
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: 'pointer' };
  }
  return true;
});

export default router;
