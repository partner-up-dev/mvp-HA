import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

type HistoryStateWithBack = {
  back?: string | null;
};

const hasRouterBackHistory = (): boolean => {
  if (typeof window === "undefined") return false;

  const state = window.history.state as HistoryStateWithBack | null;
  return typeof state?.back === "string" && state.back.length > 0;
};

export const useHeaderBackHomeAction = () => {
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const canGoBack = computed(() => {
    // Route is reactive; history state is not.
    void route.fullPath;
    return hasRouterBackHistory();
  });

  const headerActionAriaLabel = computed(() =>
    canGoBack.value ? t("common.backToPrevious") : t("common.backToHome"),
  );

  const handleHeaderAction = () => {
    if (canGoBack.value) {
      router.back();
      return;
    }

    void router.push("/");
  };

  return {
    canGoBack,
    headerActionAriaLabel,
    handleHeaderAction,
  };
};
