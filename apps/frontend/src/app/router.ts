import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { trackEvent } from "@/shared/telemetry/track";
import { captureSpmAttributionFromUrl } from "@/shared/telemetry/spm-attribution";
import { getStoredAdminHasAccess } from "@/domains/admin/model/admin-session-storage";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";

const HomePage = () => import("@/pages/HomePage.vue");
const MePage = () => import("@/pages/MePage.vue");
const MyPRsPage = () => import("@/pages/MyPRsPage.vue");
const CommunityPRCreatePage = () =>
  import("@/pages/CommunityPRCreatePage.vue");
const AnchorPRPage = () => import("@/pages/AnchorPRPage.vue");
const AnchorPRMessagesPage = () =>
  import("@/pages/AnchorPRMessagesPage.vue");
const UserProfilePage = () => import("@/pages/UserProfilePage.vue");
const AnchorPRBookingSupportPage = () =>
  import("@/pages/AnchorPRBookingSupportPage.vue");
const AdminLoginPage = () => import("@/pages/AdminLoginPage.vue");
const AdminAnchorPRPage = () => import("@/pages/AdminAnchorPRPage.vue");
const AdminAnchorPRMessagesPage = () =>
  import("@/pages/AdminAnchorPRMessagesPage.vue");
const AdminBookingSupportPage = () =>
  import("@/pages/AdminBookingSupportPage.vue");
const AdminBookingExecutionPage = () =>
  import("@/pages/AdminBookingExecutionPage.vue");
const AdminPoisPage = () => import("@/pages/AdminPoisPage.vue");
const ContactAuthorPage = () => import("@/pages/ContactAuthorPage.vue");
const ContactSupportPage = () => import("@/pages/ContactSupportPage.vue");
const AboutPage = () => import("@/pages/AboutPage.vue");
const EventPlazaPage = () => import("@/pages/EventPlazaPage.vue");
const AnchorPRSearchPage = () => import("@/pages/AnchorPRSearchPage.vue");
const AnchorEventPage = () => import("@/pages/AnchorEventPage.vue");
const WeChatOAuthCallbackPage = () =>
  import("@/pages/WeChatOAuthCallbackPage.vue");

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
    path: "/pr/:id",
    name: "pr-detail",
    component: AnchorPRPage,
    meta: {
      wechatSharePolicy: "route",
      wechatAutoLoginPolicy: "route",
    },
  },
  {
    path: "/pr/new",
    name: "pr-create",
    component: CommunityPRCreatePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/pr/:id/partners/:partnerId",
    name: "pr-partner-profile",
    component: UserProfilePage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/pr/:id/messages",
    name: "pr-messages",
    component: AnchorPRMessagesPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/pr/:id/booking-support",
    name: "pr-booking-support",
    component: AnchorPRBookingSupportPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/cpr/:id",
    name: "community-pr",
    redirect: (to) => ({
      name: "pr-detail",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: "/cpr/:id/partners/:partnerId",
    name: "community-partner-profile",
    redirect: (to) => ({
      name: "pr-partner-profile",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: "/apr/:id",
    name: "anchor-pr",
    component: AnchorPRPage,
    meta: {
      wechatSharePolicy: "route",
      wechatAutoLoginPolicy: "route",
    },
  },
  {
    path: "/apr/:id/partners/:partnerId",
    name: "anchor-partner-profile",
    redirect: (to) => ({
      name: "pr-partner-profile",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: "/apr/:id/messages",
    name: "anchor-pr-messages",
    redirect: (to) => ({
      name: "pr-messages",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: "/apr/:id/booking-support",
    name: "anchor-pr-booking-support",
    redirect: (to) => ({
      name: "pr-booking-support",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
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
    path: "/admin/anchor-pr-messages",
    name: "admin-anchor-pr-messages",
    component: AdminAnchorPRMessagesPage,
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
    path: "/admin/booking-execution",
    name: "admin-booking-execution",
    component: AdminBookingExecutionPage,
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
    path: "/events/search",
    name: "anchor-pr-search",
    component: AnchorPRSearchPage,
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
      wechatAutoLoginPolicy: "skip",
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
    page: sanitizeSensitiveRoutePath(to.fullPath),
    routeName: typeof to.name === "string" ? to.name : undefined,
    prId: parsePositiveInt(to.params.id),
  });
});
