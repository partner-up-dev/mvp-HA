import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '@/pages/HomePage.vue';
import PRPage from '@/pages/PRPage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/pr/:id',
    name: 'pr',
    component: PRPage,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
