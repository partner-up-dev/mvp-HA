import { computed, type Ref } from "vue";
import { useHead } from "@unhead/vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";

type UsePRDetailHeadOptions = {
  pr: Ref<PRDetailView | undefined>;
  shareUrl: Ref<string>;
};

export const usePRDetailHead = ({
  pr,
  shareUrl,
}: UsePRDetailHeadOptions): void => {
  const { t } = useI18n();

  const title = computed(() =>
    pr.value?.title
      ? t("prPage.metaTitleWithName", { title: pr.value.title })
      : t("prPage.metaFallbackTitle"),
  );
  const description = computed(
    () => pr.value?.core.type || t("prPage.metaFallbackDescription"),
  );

  useHead({
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: shareUrl },
      { property: "og:site_name", content: t("app.siteName") },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
  });
};
