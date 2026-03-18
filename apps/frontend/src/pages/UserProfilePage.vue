<template>
  <PageScaffoldFlow class="user-profile-page">
    <template #header>
      <PageHeader
        :title="t('userProfilePage.title')"
        :subtitle="subtitle"
        @back="goBack"
      />
    </template>

    <LoadingIndicator
      v-if="isLoading"
      :message="t('userProfilePage.loading')"
    />

    <section v-else-if="isNotFound" class="surface-card">
      <h2 class="section-title">{{ t("userProfilePage.notFoundTitle") }}</h2>
      <p class="section-copy">{{ t("userProfilePage.notFoundDescription") }}</p>
    </section>

    <ErrorToast
      v-else-if="errorMessage"
      :message="errorMessage"
      persistent
    />

    <section v-else-if="profile" class="surface-card">
      <div
        v-if="profile.isCurrentLocalUser"
        class="profile-actions"
      >
        <RouterLink class="edit-profile-link" :to="{ name: 'me' }">
          {{ t("userProfilePage.editProfileLink") }}
        </RouterLink>
      </div>

      <div class="profile-row">
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="t('userProfilePage.avatarAlt', { name: displayName })"
          class="avatar-image"
        />
        <div v-else class="avatar-fallback" aria-hidden="true">
          <span>{{ avatarFallbackText }}</span>
        </div>

        <div class="profile-copy">
          <span class="nickname-label">{{ t("userProfilePage.nicknameLabel") }}</span>
          <strong class="nickname-value">{{ displayName }}</strong>
        </div>
      </div>
    </section>

    <template #footer>
      <ContactSupportFooter />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import {
  anchorPRDetailPath,
  communityPRDetailPath,
} from "@/domains/pr/routing/routes";
import {
  usePRPartnerProfile,
  type PRPartnerProfileScenario,
} from "@/domains/user/queries/usePRPartnerProfile";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const scenario = computed<PRPartnerProfileScenario | null>(() => {
  if (route.name === "community-partner-profile") return "COMMUNITY";
  if (route.name === "anchor-partner-profile") return "ANCHOR";
  return null;
});

const prId = computed(() => parsePositiveInt(route.params.id));
const partnerId = computed(() => parsePositiveInt(route.params.partnerId));

const { data, isLoading, error } = usePRPartnerProfile(scenario, prId, partnerId);
const profile = computed(() => data.value ?? null);

const subtitle = computed(() => {
  if (scenario.value === "ANCHOR") {
    return t("userProfilePage.subtitleAnchor");
  }
  return t("userProfilePage.subtitleCommunity");
});

const displayName = computed(() => {
  const value = profile.value?.displayName?.trim();
  if (value && value.length > 0) return value;
  return t("userProfilePage.nicknameFallback");
});

const avatarFallbackText = computed(() => {
  const trimmed = displayName.value.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 1).toUpperCase();
  }
  return t("userProfilePage.avatarFallback");
});

const isNotFound = computed(() => {
  if (!(error.value instanceof Error)) {
    return false;
  }
  return error.value.message.toLowerCase().includes("not found");
});

const errorMessage = computed(() => {
  if (isNotFound.value) {
    return null;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return null;
});

const goBack = () => {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }

  if (prId.value !== null && scenario.value === "ANCHOR") {
    router.push(anchorPRDetailPath(prId.value as PRId));
    return;
  }

  if (prId.value !== null) {
    router.push(communityPRDetailPath(prId.value as PRId));
    return;
  }

  router.push("/");
};
</script>

<style scoped lang="scss">
.surface-card {
  @include mx.pu-surface-card(section);
}

.surface-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.section-title,
.section-copy {
  margin: 0;
}

.section-title {
  @include mx.pu-font(title-medium);
}

.section-copy {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-profile-link {
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.profile-row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-med);
}

.avatar-image,
.avatar-fallback {
  width: 4.75rem;
  height: 4.75rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.avatar-image {
  display: block;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
  border: 1px solid var(--sys-color-outline-variant);

  span {
    @include mx.pu-font(title-large);
  }
}

.profile-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.nickname-label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.nickname-value {
  @include mx.pu-font(headline-small);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}
</style>
