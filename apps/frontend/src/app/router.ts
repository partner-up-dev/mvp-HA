import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { trackEvent } from "@/shared/analytics/track";
import { captureSpmAttributionFromUrl } from "@/shared/analytics/spm-attribution";
import HomePage from "@/pages/HomePage.vue";
import MePage from "@/pages/MePage.vue";
import MyPRsPage from "@/pages/MyPRsPage.vue";
import CommunityPRPage from "@/pages/CommunityPRPage.vue";
import CommunityPRCreatePage from "@/pages/CommunityPRCreatePage.vue";
import AnchorPRPage from "@/pages/AnchorPRPage.vue";
import UserProfilePage from "@/pages/UserProfilePage.vue";
import AnchorPRBookingSupportPage from "@/pages/AnchorPRBookingSupportPage.vue";
import AdminLoginPage from "@/pages/AdminLoginPage.vue";
import AdminAnchorPRPage from "@/pages/AdminAnchorPRPage.vue";
import AdminBookingSupportPage from "@/pages/AdminBookingSupportPage.vue";
import AdminPoisPage from "@/pages/AdminPoisPage.vue";
import ContactAuthorPage from "@/pages/ContactAuthorPage.vue";
import ContactSupportPage from "@/pages/ContactSupportPage.vue";
import AboutPage from "@/pages/AboutPage.vue";
import EventPlazaPage from "@/pages/EventPlazaPage.vue";
import AnchorEventPage from "@/pages/AnchorEventPage.vue";
import WeChatOAuthCallbackPage from "@/pages/WeChatOAuthCallbackPage.vue";
import { getStoredAdminHasAccess } from "@/domains/admin/model/admin-session-storage";

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
    path: "/me",
    name: "me",
    component: MePage,
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
    path: "/cpr/:id/partners/:partnerId",
    name: "community-partner-profile",
    component: UserProfilePage,
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
    path: "/apr/:id/partners/:partnerId",
    name: "anchor-partner-profile",
    component: UserProfilePage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/apr/:id/booking-support",
    name: "anchor-pr-booking-support",
    component: AnchorPRBookingSupportPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/admin/login",
    name: "admin-login",
    component: AdminLoginPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/admin/anchor-pr",
    name: "admin-anchor-pr",
    component: AdminAnchorPRPage,
    meta: {
      wechatSharePolicy: "route",
      requiresAdminAuth: true,
    },
  },
  {
    path: "/admin/booking-support",
    name: "admin-booking-support",
    component: AdminBookingSupportPage,
    meta: {
      wechatSharePolicy: "route",
      requiresAdminAuth: true,
    },
  },
  {
    path: "/admin/pois",
    name: "admin-pois",
    component: AdminPoisPage,
    meta: {
      wechatSharePolicy: "route",
      requiresAdminAuth: true,
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
    path: "/about",
    name: "about",
    component: AboutPage,
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
  {
    path: "/wechat/oauth/callback",
    name: "wechat-oauth-callback",
    component: WeChatOAuthCallbackPage,
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

router.beforeEach((to) => {
  if (!to.meta.requiresAdminAuth) {
    return true;
  }

  if (getStoredAdminHasAccess()) {
    return true;
  }

  return {
    name: "admin-login",
    query: {
      redirect: to.fullPath,
    },
  };
});

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

router.afterEach((to) => {
  if (typeof window !== "undefined") {
    captureSpmAttributionFromUrl(window.location.href);
  }

  trackEvent("page_view", {
    page: to.fullPath,
    routeName: typeof to.name === "string" ? to.name : undefined,
    prId: parsePositiveInt(to.params.id),
  });
});
