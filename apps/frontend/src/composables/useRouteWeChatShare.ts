import { watch } from "vue";
import { useRoute } from "vue-router";
import { useWeChatShareCard } from "@/composables/useWeChatShareCard";
import { i18n } from "@/locales/i18n";

type RouteShareCardText = {
  title: string;
  desc: string;
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
      };
    case "pr-new":
      return {
        title: `${i18n.global.t("createPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionCreate"),
      };
    case "contact-author":
      return {
        title: `${i18n.global.t("contactAuthorPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionContactAuthor"),
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
        link: window.location.href,
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
