import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { trackEvent } from "@/shared/analytics/track";
import HomePage from "@/pages/HomePage.vue";
import MyPRsPage from "@/pages/MyPRsPage.vue";
import CommunityPRPage from "@/pages/CommunityPRPage.vue";
import CommunityPRCreatePage from "@/pages/CommunityPRCreatePage.vue";
import AnchorPRPage from "@/pages/AnchorPRPage.vue";
import AnchorPREconomyPage from "@/pages/AnchorPREconomyPage.vue";
import ContactAuthorPage from "@/pages/ContactAuthorPage.vue";
import ContactSupportPage from "@/pages/ContactSupportPage.vue";
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
    path: "/pr/mine",
    name: "pr-mine",
    component: MyPRsPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/cpr/:id",
    name: "community-pr",
    component: CommunityPRPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/apr/:id",
    name: "anchor-pr",
    component: AnchorPRPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/apr/:id/economy",
    name: "anchor-pr-economy",
    component: AnchorPREconomyPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/cpr/new",
    name: "community-pr-create",
    component: CommunityPRCreatePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/contact-support",
    name: "contact-support",
    component: ContactSupportPage,
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

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

router.afterEach((to) => {
  trackEvent("page_view", {
    page: to.fullPath,
    routeName: typeof to.name === "string" ? to.name : undefined,
    prId: parsePositiveInt(to.params.id),
  });
});
