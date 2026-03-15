<template>
  <PageScaffoldCentered class="admin-login-page">
    <template #header>
      <header class="admin-login-page__header">
        <p class="admin-login-page__eyebrow">{{ t("adminCommon.title") }}</p>
        <h1 class="admin-login-page__title">{{ t("adminLogin.title") }}</h1>
        <p class="admin-login-page__subtitle">{{ t("adminLogin.subtitle") }}</p>
      </header>
    </template>

    <section class="admin-login-card">
      <div class="admin-login-card__glow" aria-hidden="true" />

      <div class="admin-login-card__content">
        <label class="field">
          <span class="field__label">{{ t("adminLogin.userIdLabel") }}</span>
          <input
            v-model="form.userId"
            class="field__input"
            type="text"
            inputmode="text"
            autocomplete="username"
            :placeholder="t('adminLogin.userIdPlaceholder')"
          />
        </label>

        <label class="field">
          <span class="field__label">{{ t("adminLogin.passwordLabel") }}</span>
          <input
            v-model="form.password"
            class="field__input"
            type="password"
            autocomplete="current-password"
            :placeholder="t('adminLogin.passwordPlaceholder')"
            @keydown.enter="handleSubmit"
          />
        </label>

        <button
          class="admin-login-card__submit"
          type="button"
          :disabled="loginMutation.isPending.value"
          @click="handleSubmit"
        >
          {{ loginMutation.isPending.value ? t("adminLogin.loggingIn") : t("adminLogin.loginAction") }}
        </button>

        <p class="admin-login-card__hint">{{ t("adminLogin.seedHint") }}</p>
        <ErrorToast
          v-if="loginMutation.error.value"
          :message="loginMutation.error.value.message"
          persistent
        />
      </div>
    </section>
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { reactive, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { useAdminLogin } from "@/domains/admin/queries/useAdminLogin";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const loginMutation = useAdminLogin();
const form = reactive({
  userId: "",
  password: "",
});

const resolveRedirectTarget = (): string => {
  const redirect = route.query.redirect;
  if (typeof redirect === "string" && redirect.startsWith("/admin/")) {
    return redirect;
  }

  return "/admin/anchor-pr";
};

const handleSubmit = async () => {
  const payload = await loginMutation.mutateAsync({
    userId: form.userId.trim(),
    password: form.password,
  });

  userSessionStore.applyAuthSession(payload);
  form.password = "";
  await router.replace(resolveRedirectTarget());
};

watchEffect(() => {
  if (!userSessionStore.hasAdminAccess) {
    return;
  }

  void router.replace(resolveRedirectTarget());
});
</script>

<style lang="scss" scoped>
.admin-login-page {
  --pu-page-max-width: 980px;
}

.admin-login-page__header,
.admin-login-card,
.admin-login-card__content,
.field {
  display: flex;
  flex-direction: column;
}

.admin-login-page__header {
  gap: var(--sys-spacing-sm);
  align-items: center;
  text-align: center;
}

.admin-login-page__eyebrow {
  @include mx.pu-font(label-medium);
  margin: 0;
  color: var(--sys-color-primary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-login-page__title,
.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  margin: 0;
}

.admin-login-page__title {
  font-size: var(--dcs-typography-page-hero-size);
  font-weight: var(--dcs-typography-page-hero-weight);
  line-height: var(--dcs-typography-page-hero-line-height);
}

.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  color: var(--sys-color-on-surface-variant);
}

.admin-login-card {
  position: relative;
  width: min(100%, var(--dcs-layout-panel-max-width));
  @include mx.pu-surface-panel(admin-login);
}

.admin-login-card__glow {
  position: absolute;
  inset: auto -10% -30% auto;
  width: 14rem;
  height: 14rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sys-color-primary) 16%, transparent);
  filter: blur(36px);
}

.admin-login-card__content {
  position: relative;
  gap: var(--sys-spacing-med);
  padding: var(--dcs-space-admin-panel-padding);
}

.field {
  gap: var(--sys-spacing-sm);
}

.field__label {
  @include mx.pu-font(label-large);
}

.field__input {
  @include mx.pu-field-shell;
}

.admin-login-card__submit {
  @include mx.pu-font(label-large);
  @include mx.pu-pill-action(solid-primary, large);
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.admin-login-card__submit:disabled {
  cursor: default;
  opacity: 0.72;
}
</style>
