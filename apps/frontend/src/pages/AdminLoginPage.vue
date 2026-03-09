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
import ErrorToast from "@/components/common/ErrorToast.vue";
import { useAdminLogin } from "@/queries/useAdminAuth";
import { useUserSessionStore } from "@/stores/userSessionStore";
import PageScaffoldCentered from "@/widgets/common/PageScaffoldCentered.vue";

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
  gap: var(--sys-spacing-xs, 0.5rem);
  align-items: center;
  text-align: center;
}

.admin-login-page__eyebrow {
  margin: 0;
  color: var(--sys-color-primary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.admin-login-page__title,
.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  margin: 0;
}

.admin-login-page__title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
}

.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  color: var(--sys-color-on-surface-variant);
}

.admin-login-card {
  position: relative;
  width: min(100%, 30rem);
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--sys-color-primary) 24%, var(--sys-color-outline-variant));
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--sys-color-primary) 18%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--sys-color-surface) 82%, var(--sys-color-surface-container-high)), var(--sys-color-surface-container));
  @include mx.pu-elevation(2);
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
  padding: clamp(1.4rem, 4vw, 2rem);
}

.field {
  gap: 0.45rem;
}

.field__label {
  font-size: 0.82rem;
}

.field__input {
  width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  border: 1px solid var(--sys-color-outline-variant);
  background: color-mix(in srgb, var(--sys-color-surface) 88%, white);
  color: var(--sys-color-on-surface);
}

.admin-login-card__submit {
  border: none;
  border-radius: 999px;
  padding: 0.85rem 1rem;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;
}

.admin-login-card__submit:disabled {
  cursor: default;
  opacity: 0.72;
}
</style>
