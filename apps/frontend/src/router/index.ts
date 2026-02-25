import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import HomePage from "@/pages/HomePage.vue";
import PRPage from "@/pages/PRPage.vue";
import PRCreatePage from "@/pages/PRCreatePage.vue";
import ContactAuthorPage from "@/pages/ContactAuthorPage.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/pr/:id",
    name: "pr",
    component: PRPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/pr/new",
    name: "pr-new",
    component: PRCreatePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/contact-author",
    name: "contact-author",
    component: ContactAuthorPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;

    if (to.hash) {
      return {
        el: to.hash,
        top: 0,
        behavior: "smooth",
      };
    }

    return { left: 0, top: 0 };
  },
});
