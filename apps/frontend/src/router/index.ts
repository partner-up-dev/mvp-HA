import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import HomePage from "@/pages/HomePage.vue";
import PRPage from "@/pages/PRPage.vue";
import PRCreatePage from "@/pages/PRCreatePage.vue";
import PREconomyPage from "@/pages/PREconomyPage.vue";
import ContactAuthorPage from "@/pages/ContactAuthorPage.vue";
import EventPlazaPage from "@/pages/EventPlazaPage.vue";
import AnchorEventPage from "@/pages/AnchorEventPage.vue";

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
    path: "/pr/:id/economy",
    name: "pr-economy",
    component: PREconomyPage,
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
  {
    path: "/events",
    name: "event-plaza",
    component: EventPlazaPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/events/:eventId",
    name: "anchor-event",
    component: AnchorEventPage,
    meta: {
      wechatSharePolicy: "skip",
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
