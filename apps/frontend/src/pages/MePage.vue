<template>
  <PageScaffoldFlow class="me-page">
    <template #header>
      <PageHeader
        :title="t('mePage.title')"
        :subtitle="t('mePage.description')"
      />
    </template>

    <div class="page-main">
      <InlineNotice
        v-if="bindFeedbackMessage"
        :tone="bindFeedbackCode === 'success' ? 'success' : 'error'"
        :message="bindFeedbackMessage"
      />

      <ErrorToast v-if="errorMessage" :message="errorMessage" persistent />

      <LoadingIndicator
        v-if="
          userSessionStore.isAuthenticated && currentUserQuery.isLoading.value
        "
        :message="t('mePage.loading')"
      />

      <SurfaceCard gap="md">
        <div class="section-header">
          <div>
            <h2>{{ t("mePage.profile.title") }}</h2>
            <p>{{ t("mePage.profile.description") }}</p>
          </div>
          <span
            class="status-pill"
            :class="{ 'status-pill--bound': wechatBound }"
          >
            {{
              wechatBound
                ? t("mePage.profile.wechatBound")
                : t("mePage.profile.wechatUnbound")
            }}
          </span>
        </div>

        <div class="profile-panel">
          <Avatar
            :src="avatarUrl"
            :alt="t('mePage.profile.avatarAlt')"
            :name="currentUser?.nickname ?? null"
            :fallback="avatarFallbackText"
            size="xl"
          />

          <div class="profile-form">
            <FormField
              :label="t('mePage.profile.nicknameLabel')"
              for-id="me-profile-nickname"
            >
              <input
                id="me-profile-nickname"
                v-model="nicknameDraft"
                class="text-input"
                type="text"
                :placeholder="t('mePage.profile.nicknamePlaceholder')"
                :disabled="!canEditProfile"
                maxlength="40"
                @keydown.enter.prevent="handleSaveNickname"
              />
            </FormField>

            <div class="profile-actions">
              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="!canSaveNickname"
                :loading="updateProfileMutation.isPending.value"
                @click="handleSaveNickname"
              >
                {{ t("mePage.profile.saveNickname") }}
              </Button>

              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                :disabled="!canEditProfile || updateAvatarMutation.isPending.value"
                :loading="updateAvatarMutation.isPending.value"
                @click="handlePickAvatar"
              >
                {{ t("mePage.profile.changeAvatar") }}
              </Button>

              <input
                ref="avatarInputRef"
                class="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="handleAvatarChange"
              />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <template v-if="!userSessionStore.isAuthenticated">
        <SurfaceCard gap="md">
          <div class="section-header">
            <div>
              <h2>{{ t("mePage.wechatLogin.title") }}</h2>
              <p>{{ wechatLoginHintText }}</p>
            </div>
          </div>

          <Button
            v-if="isWeChatEnv"
            appearance="pill"
            size="sm"
            type="button"
            :disabled="wechatLoginPending"
            :loading="wechatLoginPending"
            @click="handleStartWeChatLogin"
          >
            {{ t("mePage.wechatLogin.action") }}
          </Button>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="section-header">
            <div>
              <h2>{{ t("mePage.pinLogin.title") }}</h2>
              <p>{{ t("mePage.pinLogin.description") }}</p>
            </div>
          </div>

          <div class="pin-login-fields">
            <FormField
              :label="t('mePage.pinLogin.userIdLabel')"
              for-id="me-login-user-id"
            >
              <input
                id="me-login-user-id"
                v-model="pinLoginDraft.userId"
                class="text-input"
                type="text"
                :placeholder="t('mePage.pinLogin.userIdPlaceholder')"
                autocomplete="username"
                @keydown.enter.prevent="handlePinLogin"
              />
            </FormField>

            <FormField
              :label="t('mePage.pinLogin.pinLabel')"
              for-id="me-login-user-pin"
              :hint="
                showPinFormatHint ? t('mePage.pinLogin.pinFormatHint') : null
              "
            >
              <input
                id="me-login-user-pin"
                v-model="pinLoginDraft.userPin"
                class="text-input"
                type="password"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="4"
                :placeholder="t('mePage.pinLogin.pinPlaceholder')"
                autocomplete="one-time-code"
                @keydown.enter.prevent="handlePinLogin"
              />
            </FormField>
          </div>

          <div class="profile-actions">
            <Button
              appearance="pill"
              size="sm"
              type="button"
              :disabled="!canSubmitPinLogin"
              :loading="loginWithPinMutation.isPending.value"
              @click="handlePinLogin"
            >
              {{ t("mePage.pinLogin.action") }}
            </Button>
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              :disabled="registerLocalAccountMutation.isPending.value"
              :loading="registerLocalAccountMutation.isPending.value"
              @click="handleRegisterLocalAccount"
            >
              {{ t("mePage.register.action") }}
            </Button>
          </div>
        </SurfaceCard>
      </template>

      <template v-else>
        <SurfaceCard gap="md">
          <div class="section-header">
            <div>
              <h2>{{ t("mePage.wechat.title") }}</h2>
              <p>{{ bindHintText }}</p>
            </div>
          </div>

          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="bindActionDisabled"
            :loading="startWeChatBindMutation.isPending.value"
            @click="handleStartWeChatBind"
          >
            {{
              startWeChatBindMutation.isPending.value
                ? t("mePage.wechat.bindingAction")
                : wechatBound
                  ? t("mePage.wechat.boundAction")
                  : t("mePage.wechat.bindAction")
            }}
          </Button>
        </SurfaceCard>

        <WeChatNotificationSubscriptionsCard
          :title="t('mePage.reminder.title')"
        >
          <APRNotificationSubscriptions
            :updating-label="t('prPage.wechatReminder.updating')"
            @error-change="handleNotificationSubscriptionErrorChange"
          />
        </WeChatNotificationSubscriptionsCard>

        <SurfaceCard gap="md">
          <div class="section-header">
            <div>
              <h2>{{ t("mePage.credentials.title") }}</h2>
              <p>{{ t("mePage.credentials.description") }}</p>
            </div>
          </div>

          <div class="credential-list">
            <div class="credential-item">
              <div class="credential-copy">
                <span class="credential-label">{{
                  t("mePage.credentials.userIdLabel")
                }}</span>
                <code class="credential-value">{{ storedUserIdLabel }}</code>
              </div>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                :disabled="!storedUserId"
                @click="handleCopyCredential('userId', storedUserId)"
              >
                {{
                  copiedField === "userId" ? t("common.copied") : t("common.copy")
                }}
              </Button>
            </div>

            <div class="credential-item">
              <div class="credential-copy">
                <span class="credential-label">{{
                  t("mePage.credentials.userPinLabel")
                }}</span>
                <code class="credential-value">{{ displayedUserPin }}</code>
              </div>
              <div class="credential-actions">
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="!storedUserPin"
                  @click="pinVisible = !pinVisible"
                >
                  {{
                    pinVisible
                      ? t("mePage.credentials.hidePin")
                      : t("mePage.credentials.showPin")
                  }}
                </Button>
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="!storedUserPin"
                  @click="handleCopyCredential('userPin', storedUserPin)"
                >
                  {{
                    copiedField === "userPin"
                      ? t("common.copied")
                      : t("common.copy")
                  }}
                </Button>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <RouterLink class="history-link" :to="{ name: 'pr-mine' }">
          <div class="history-link__copy">
            <h2>{{ t("mePage.history.title") }}</h2>
            <p>{{ t("mePage.history.description") }}</p>
          </div>
          <span class="history-link__action">
            {{ t("mePage.history.action") }}
            <span
              class="history-link__icon i-mdi:arrow-right"
              aria-hidden="true"
            ></span>
          </span>
        </RouterLink>
      </template>
    </div>

    <template #footer>
      <ContactSupportFooter />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import Avatar from "@/shared/ui/identity/Avatar.vue";
import Button from "@/shared/ui/actions/Button.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { useCurrentUserProfile } from "@/domains/user/queries/useCurrentUserProfile";
import { useUpdateCurrentUserProfile } from "@/domains/user/queries/useUpdateCurrentUserProfile";
import { useUpdateCurrentUserAvatar } from "@/domains/user/queries/useUpdateCurrentUserAvatar";
import { useStartWeChatBind } from "@/domains/user/queries/useStartWeChatBind";
import { useRegisterLocalAccount } from "@/domains/user/queries/useRegisterLocalAccount";
import { useLoginWithPin } from "@/domains/user/queries/useLoginWithPin";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { copyToClipboard } from "@/lib/clipboard";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

const PIN_PATTERN = /^\d{4}$/;

const route = useRoute();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();

const currentUserQuery = useCurrentUserProfile();
const updateProfileMutation = useUpdateCurrentUserProfile();
const updateAvatarMutation = useUpdateCurrentUserAvatar();
const startWeChatBindMutation = useStartWeChatBind();
const registerLocalAccountMutation = useRegisterLocalAccount();
const loginWithPinMutation = useLoginWithPin();

const avatarInputRef = ref<HTMLInputElement | null>(null);
const nicknameDraft = ref("");
const pinVisible = ref(false);
const copiedField = ref<"userId" | "userPin" | null>(null);
const copyErrorMessage = ref<string | null>(null);
const notificationSubscriptionsPanelError = ref<Error | null>(null);
const wechatLoginPending = ref(false);
const pinLoginDraft = reactive({
  userId: "",
  userPin: "",
});

const currentUser = computed(() => currentUserQuery.data.value ?? null);
const canEditProfile = computed(
  () => userSessionStore.isAuthenticated && currentUser.value !== null,
);
const avatarUrl = computed(() => currentUser.value?.avatar ?? null);
const wechatBound = computed(() => currentUser.value?.wechatBound ?? false);
const storedUserId = computed(() => userSessionStore.userId ?? null);
const storedUserPin = computed(() => userSessionStore.userPin ?? null);
const storedUserIdLabel = computed(
  () => storedUserId.value ?? t("mePage.credentials.missingUserId"),
);
const displayedUserPin = computed(() => {
  if (!storedUserPin.value) return t("mePage.credentials.missingUserPin");
  if (pinVisible.value) return storedUserPin.value;
  return "•".repeat(storedUserPin.value.length);
});
const isWeChatEnv = computed(() =>
  typeof navigator === "undefined" ? false : isWeChatBrowser(),
);
const wechatLoginHintText = computed(() =>
  isWeChatEnv.value
    ? t("mePage.wechatLogin.wechatHint")
    : t("mePage.wechatLogin.nonWechatHint"),
);
const normalizedPinLoginUserId = computed(() => pinLoginDraft.userId.trim());
const normalizedPinLoginPin = computed(() => pinLoginDraft.userPin.trim());
const showPinFormatHint = computed(
  () =>
    normalizedPinLoginPin.value.length > 0 &&
    !PIN_PATTERN.test(normalizedPinLoginPin.value),
);
const canSubmitPinLogin = computed(
  () =>
    !loginWithPinMutation.isPending.value &&
    normalizedPinLoginUserId.value.length > 0 &&
    PIN_PATTERN.test(normalizedPinLoginPin.value),
);
const bindFeedbackCode = computed(() => {
  const raw = route.query.wechatBind;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const bindFeedbackMessage = computed(() => {
  if (bindFeedbackCode.value === "success") {
    return t("mePage.wechat.bindSuccess");
  }
  if (bindFeedbackCode.value === "conflict") {
    return t("mePage.wechat.bindConflict");
  }
  if (bindFeedbackCode.value === "failed") {
    return t("mePage.wechat.bindFailed");
  }
  return null;
});
const avatarFallbackText = computed(() => {
  const nickname = currentUser.value?.nickname?.trim();
  if (!nickname) return t("mePage.profile.avatarFallback");
  return nickname.slice(0, 1).toUpperCase();
});
const canSaveNickname = computed(() => {
  const normalizedDraft = nicknameDraft.value.trim();
  const normalizedCurrent = currentUser.value?.nickname?.trim() ?? "";
  return (
    canEditProfile.value &&
    normalizedDraft.length > 0 &&
    normalizedDraft !== normalizedCurrent &&
    !updateProfileMutation.isPending.value
  );
});
const bindActionDisabled = computed(
  () =>
    currentUser.value === null ||
    wechatBound.value ||
    !isWeChatEnv.value ||
    startWeChatBindMutation.isPending.value,
);
const bindHintText = computed(() => {
  if (wechatBound.value) {
    return t("mePage.wechat.boundHint");
  }
  if (!isWeChatEnv.value) {
    return t("mePage.wechat.nonWechatHint");
  }
  return t("mePage.wechat.unboundHint");
});

const errorMessage = computed(() => {
  const candidates = [
    currentUserQuery.error.value,
    updateProfileMutation.error.value,
    updateAvatarMutation.error.value,
    startWeChatBindMutation.error.value,
    registerLocalAccountMutation.error.value,
    loginWithPinMutation.error.value,
    notificationSubscriptionsPanelError.value,
  ];

  const firstError = candidates.find((candidate) => candidate instanceof Error);
  if (firstError instanceof Error) {
    return firstError.message;
  }

  return copyErrorMessage.value;
});

watch(
  () => currentUser.value?.nickname,
  (nextNickname) => {
    nicknameDraft.value = nextNickname ?? "";
  },
  { immediate: true },
);

const handleSaveNickname = async () => {
  if (!canSaveNickname.value) return;
  await updateProfileMutation.mutateAsync({
    nickname: nicknameDraft.value.trim(),
  });
};

const handlePickAvatar = () => {
  avatarInputRef.value?.click();
};

const handleAvatarChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const nextFile = input?.files?.[0] ?? null;
  if (!nextFile) return;

  await updateAvatarMutation.mutateAsync({ avatar: nextFile });
  if (input) {
    input.value = "";
  }
};

const handleStartWeChatLogin = () => {
  if (typeof window === "undefined") return;
  if (!isWeChatEnv.value || wechatLoginPending.value) return;

  wechatLoginPending.value = true;
  redirectToWeChatOAuthLogin(window.location.href);
};

const handlePinLogin = async () => {
  if (!canSubmitPinLogin.value) return;

  const payload = await loginWithPinMutation.mutateAsync({
    userId: normalizedPinLoginUserId.value,
    userPin: normalizedPinLoginPin.value,
  });
  userSessionStore.applyAuthSession(payload);
  pinLoginDraft.userPin = "";
};

const handleStartWeChatBind = async () => {
  if (bindActionDisabled.value || typeof window === "undefined") return;

  const result = await startWeChatBindMutation.mutateAsync({
    returnTo: window.location.href,
  });
  window.location.assign(result.authorizeUrl);
};

const handleRegisterLocalAccount = async () => {
  const payload = await registerLocalAccountMutation.mutateAsync();
  userSessionStore.applyAuthSession(payload);
};

const handleNotificationSubscriptionErrorChange = (error: Error | null) => {
  notificationSubscriptionsPanelError.value = error;
};

const handleCopyCredential = async (
  field: "userId" | "userPin",
  value: string | null,
) => {
  if (!value) return;

  try {
    await copyToClipboard(value);
    copyErrorMessage.value = null;
    copiedField.value = field;
    window.setTimeout(() => {
      if (copiedField.value === field) {
        copiedField.value = null;
      }
    }, 1500);
  } catch (error) {
    copyErrorMessage.value =
      error instanceof Error ? error.message : t("common.copyFailed");
  }
};
</script>

<style scoped lang="scss">
.page-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.history-link {
  @include mx.pu-surface-card(section);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
  }

  p {
    margin-top: var(--sys-spacing-xs);
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
  }
}

.status-pill {
  @include mx.pu-pill-badge(secondary);
  flex-shrink: 0;
}

.status-pill--bound {
  @include mx.pu-pill-badge(primary);
}

.profile-panel {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sys-spacing-med);
  align-items: center;
}

.profile-form,
.pin-login-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.pin-login-fields {
  gap: var(--sys-spacing-med);
}

.text-input {
  @include mx.pu-field-shell;
}

.profile-actions,
.credential-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.credential-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.credential-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-md);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  background: var(--sys-color-surface-container-lowest);
}

.credential-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.credential-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.credential-value {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.history-link {
  text-decoration: none;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sys-spacing-sm);
  align-items: center;
  color: inherit;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-1px);
    @include mx.pu-elevation(2);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.history-link__copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
  }
}

.history-link__action {
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
}

.history-link__icon {
  margin-left: var(--sys-spacing-xs);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .profile-panel,
  .history-link,
  .credential-item {
    grid-template-columns: 1fr;
  }

  .profile-panel {
    justify-items: start;
  }

  .credential-item {
    align-items: stretch;
  }
}
</style>
