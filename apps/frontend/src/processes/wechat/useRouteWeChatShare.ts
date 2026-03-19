import { watch } from "vue";
import { useRoute } from "vue-router";
import { useWeChatShareCard } from "@/shared/wechat/useWeChatShareCard";
import { i18n } from "@/locales/i18n";
import {
  buildProductShareUrl,
  type ShareSpmRouteKey,
} from "@/shared/url/spm";

type RouteShareCardText = {
  title: string;
  desc: string;
  spmRouteKey: ShareSpmRouteKey;
};

const normalizeText = (raw: string): string => raw.replace(/\s+/g, " ").trim();

const resolveRouteShareCardText = (
  routeName: string | symbol | null | undefined,
): RouteShareCardText | null => {
  switch (routeName) {
    case "home":
      return {
        title: i18n.global.t("app.siteName"),
        desc: i18n.global.t("share.wechat.pageDescriptionHome"),
        spmRouteKey: "home",
      };
    case "community-pr-create":
      return {
        title: `${i18n.global.t("createPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionCreate"),
        spmRouteKey: "community_pr_create",
      };
    case "contact-support":
      return {
        title: `${i18n.global.t("contactSupportPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionContactSupport"),
        spmRouteKey: "contact_support",
      };
    case "contact-author":
      return {
        title: `${i18n.global.t("contactAuthorPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionContactAuthor"),
        spmRouteKey: "contact_author",
      };
    default:
      return null;
  }
};

const resolveRouteShareLogoUrl = (): string => {
  if (typeof window === "undefined") return "";
  return new URL("/share-logo.png", window.location.origin).toString();
};

export const useRouteWeChatShare = () => {
  const route = useRoute();
  const { updateWeChatShareCard } = useWeChatShareCard();

  const updateRouteWeChatShare = async (): Promise<void> => {
    if (typeof window === "undefined") return;
    if (route.meta.wechatSharePolicy !== "route") return;

    const shareCardText = resolveRouteShareCardText(route.name);
    if (!shareCardText) return;

    try {
      await updateWeChatShareCard({
        title: normalizeText(shareCardText.title),
        desc: normalizeText(shareCardText.desc),
        link: buildProductShareUrl({
          rawUrl: window.location.href,
          baseHref: window.location.href,
          routeKey: shareCardText.spmRouteKey,
          methodKey: "wechat_share",
        }),
        imgUrl: resolveRouteShareLogoUrl(),
      });
    } catch (error) {
      console.warn("Failed to configure route WeChat share card:", error);
    }
  };

  watch(
    () =>
      [
        route.fullPath,
        route.name,
        route.meta.wechatSharePolicy,
        i18n.global.locale,
      ] as const,
    () => {
      void updateRouteWeChatShare();
    },
    { immediate: true },
  );

  return {
    updateRouteWeChatShare,
  };
};
