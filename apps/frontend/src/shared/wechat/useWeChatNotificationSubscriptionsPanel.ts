import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  redirectToWeChatOAuthBind,
  redirectToWeChatOAuthLogin,
} from "@/processes/wechat/oauth-login";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { useWeChatNotificationSubscriptions } from "@/shared/wechat/queries/useWeChatNotificationSubscriptions";
import { useUpdateWeChatNotificationSubscription } from "@/shared/wechat/queries/useUpdateWeChatNotificationSubscription";

export type WeChatNotificationKind =
  | "REMINDER_CONFIRMATION"
  | "BOOKING_RESULT"
  | "NEW_PARTNER";

type NotificationActionKind = "TOGGLE" | "LOGIN" | "BIND" | null;

export type NotificationSubscriptionCardItem = {
  key: WeChatNotificationKind;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: NotificationActionKind;
  actionDisabled: boolean;
  pending: boolean;
};

type UseWeChatNotificationSubscriptionsPanelInput = {
  visibleKinds: readonly WeChatNotificationKind[];
};

export const useWeChatNotificationSubscriptionsPanel = ({
  visibleKinds,
}: UseWeChatNotificationSubscriptionsPanelInput) => {
  const { t } = useI18n();
  const query = useWeChatNotificationSubscriptions();
  const mutation = useUpdateWeChatNotificationSubscription();

  const isWeChatEnv = computed(() =>
    typeof navigator === "undefined" ? false : isWeChatAbilityEnv(),
  );

  const handleAction = async (kind: WeChatNotificationKind): Promise<void> => {
    const item = items.value.find((entry) => entry.key === kind);
    if (!item || !item.actionKind || item.actionDisabled || item.pending) {
      return;
    }
    if (item.actionKind === "LOGIN") {
      if (typeof window !== "undefined") {
        redirectToWeChatOAuthLogin(window.location.href);
      }
      return;
    }

    if (item.actionKind === "BIND") {
      if (typeof window !== "undefined") {
        await redirectToWeChatOAuthBind(window.location.href);
      }
      return;
    }

    const enabled = query.data.value?.subscriptions[kind].enabled ?? false;
    await mutation.mutateAsync({
      kind,
      enabled: !enabled,
    });
  };

  const resolveItemTitle = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.title",
      );
    }
    if (kind === "BOOKING_RESULT") {
      return t("prPage.notificationSubscriptions.items.BOOKING_RESULT.title");
    }
    return t("prPage.notificationSubscriptions.items.NEW_PARTNER.title");
  };

  const resolveItemEnabledHint = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.enabledHint",
      );
    }
    if (kind === "BOOKING_RESULT") {
      return t(
        "prPage.notificationSubscriptions.items.BOOKING_RESULT.enabledHint",
      );
    }
    return t("prPage.notificationSubscriptions.items.NEW_PARTNER.enabledHint");
  };

  const resolveItemDisabledHint = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.disabledHint",
      );
    }
    if (kind === "BOOKING_RESULT") {
      return t(
        "prPage.notificationSubscriptions.items.BOOKING_RESULT.disabledHint",
      );
    }
    return t("prPage.notificationSubscriptions.items.NEW_PARTNER.disabledHint");
  };

  const items = computed<NotificationSubscriptionCardItem[]>(() => {
    const result: NotificationSubscriptionCardItem[] = [];
    const payload = query.data.value;
    const oauthConfigured = payload?.configured ?? false;
    const authenticated = payload?.authenticated ?? false;
    const wechatBound = payload?.wechatBound ?? false;
    const pendingKind = mutation.variables.value?.kind ?? null;

    for (const kind of visibleKinds) {
      const entry = payload?.subscriptions[kind];
      const enabled = entry?.enabled ?? false;
      const kindConfigured = entry?.configured ?? false;
      const pending = mutation.isPending.value && pendingKind === kind;

      let description = "";
      let actionLabel: string | null = null;
      let actionKind: NotificationActionKind = null;
      let actionDisabled = true;

      if (!oauthConfigured) {
        description = t("prPage.wechatReminder.unconfiguredHint");
      } else if (!isWeChatEnv.value) {
        description = t("prPage.wechatReminder.nonWechatHint");
      } else if (!kindConfigured) {
        if (kind === "NEW_PARTNER") {
          description = t(
            "prPage.notificationSubscriptions.items.NEW_PARTNER.unconfiguredHint",
          );
        } else if (kind === "REMINDER_CONFIRMATION") {
          description = t("prPage.wechatReminder.unconfiguredHint");
        } else {
          description = t(
            "prPage.notificationSubscriptions.items.BOOKING_RESULT.disabledHint",
          );
        }
      } else if (!authenticated) {
        description = t("prPage.wechatReminder.loginHint");
        actionLabel = t("prPage.wechatReminder.loginAction");
        actionKind = "LOGIN";
        actionDisabled = false;
      } else if (!wechatBound) {
        description = t("mePage.wechat.unboundHint");
        actionLabel = t("mePage.wechat.bindAction");
        actionKind = "BIND";
        actionDisabled = false;
      } else {
        description = enabled
          ? resolveItemEnabledHint(kind)
          : resolveItemDisabledHint(kind);
        actionLabel = enabled
          ? t("prPage.wechatReminder.disableAction")
          : t("prPage.wechatReminder.enableAction");
        actionKind = "TOGGLE";
        actionDisabled = pending;
      }

      result.push({
        key: kind,
        title: resolveItemTitle(kind),
        description,
        actionLabel,
        actionKind,
        actionDisabled,
        pending,
      });
    }

    return result;
  });

  return {
    isWeChatEnv,
    items,
    query,
    mutation,
    handleAction,
  };
};
