<template>
  <PageScaffold class="pr-page">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PRHeroHeader
        :title="prDetail.title"
        :status="prDetail.status"
        :created-at-label="formatDate(prDetail.createdAt)"
        @back="goHome"
      />

      <section v-if="prDetail.status === 'DRAFT'" class="surface-card">
        <h2 class="card-title">{{ t("prPage.publishDraft.title") }}</h2>
        <p class="card-copy">{{ t("prPage.publishDraft.description") }}</p>
        <button
          class="primary-button"
          :disabled="publishMutation.isPending.value"
          @click="handlePublishDraft"
        >
          {{
            publishMutation.isPending.value
              ? t("prPage.publishDraft.pending")
              : t("prPage.publishDraft.action")
          }}
        </button>
      </section>

      <section v-if="showPinHelpCard" class="surface-card">
        <h2 class="card-title">{{ t("prPage.pinHelp.title") }}</h2>
        <p class="card-copy">{{ t("prPage.pinHelp.description") }}</p>
        <p v-if="userSessionStore.userPin" class="pin-text">
          {{
            t("prPage.pinHelp.currentPin", { pin: userSessionStore.userPin })
          }}
        </p>
      </section>

      <PRFactsCard
        :type="prDetail.core.type"
        :time="localizedTime"
        :location="prDetail.core.location"
        :min-partners="prDetail.core.minPartners"
        :max-partners="prDetail.core.maxPartners"
        :partners="prDetail.core.partners"
        :budget="prDetail.core.budget"
        :preferences="prDetail.core.preferences"
        :notes="prDetail.core.notes"
        :raw-text="prDetail.rawText"
      >
        <template #location-extra>
          <button
            v-if="locationGallery.length > 0"
            class="link-button"
            type="button"
            @click="showLocationGalleryModal = true"
          >
            {{ t("prCard.viewLocationImages") }}
          </button>
        </template>
      </PRFactsCard>

      <CommunityPRActionsBar
        :can-join="sharedActions.canJoin.value"
        :has-joined="sharedActions.hasJoined.value"
        :is-creator="isCreator"
        :show-edit-content-action="sharedActions.showEditContentAction.value"
        :show-modify-status-action="sharedActions.showModifyStatusAction.value"
        :slot-state-text="sharedActions.slotStateText.value"
        :join-pending="sharedActions.joinPending.value"
        :exit-pending="sharedActions.exitPending.value"
        @join="sharedActions.handleJoin"
        @exit="sharedActions.handleExit"
        @edit-content="showEditModal = true"
        @modify-status="showModifyModal = true"
      />

      <section v-if="sharedActions.hasJoined.value" class="surface-card">
        <h2 class="card-title">{{ t("prPage.wechatReminder.title") }}</h2>
        <p class="card-copy">{{ reminderHintText }}</p>

        <button
          v-if="canToggleReminder"
          class="primary-button"
          :disabled="reminderTogglePending"
          @click="handleToggleWechatReminder"
        >
          {{
            reminderTogglePending
              ? t("prPage.wechatReminder.updating")
              : reminderEnabled
                ? t("prPage.wechatReminder.disableAction")
                : t("prPage.wechatReminder.enableAction")
          }}
        </button>

        <button
          v-else-if="
            isWeChatEnv && reminderConfigured && !reminderAuthenticated
          "
          class="secondary-button"
          @click="handleGoWechatLogin"
        >
          {{ t("prPage.wechatReminder.loginAction") }}
        </button>
      </section>

      <PRShareSection
        v-if="prShareData && id !== null"
        :pr-id="id"
        :share-url="shareUrl"
        :pr-data="prShareData"
      />

      <EditPRContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-fields="editableFields"
        :pr-id="id"
        scenario="COMMUNITY"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <UpdatePRStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        scenario="COMMUNITY"
        @close="showModifyModal = false"
      />

      <PRLocationGalleryModal
        :open="showLocationGalleryModal"
        :images="locationGallery"
        @close="showLocationGalleryModal = false"
      />
    </template>

    <ContactSupportFooter />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PRHeroHeader from "@/domains/pr/ui/composites/PRHeroHeader.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import CommunityPRActionsBar from "@/domains/pr/ui/sections/CommunityPRActionsBar.vue";
import {
  useCommunityPR,
  usePublishCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import { useWeChatReminderSubscription } from "@/shared/wechat/queries/useWeChatReminderSubscription";
import { useUpdateWeChatReminderSubscription } from "@/shared/wechat/queries/useUpdateWeChatReminderSubscription";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/stores/userSessionStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { requireWeChatActionAuth } from "@/processes/wechat/requireWeChatActionAuth";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/useAutoWeChatLogin";
import type { CommunityPRFormFields } from "@/domains/pr/model/types";
import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindow,
} from "@/lib/datetime";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = computed<PRId | null>(() => {
  const rawId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed as PRId) : null;
});

const { data, isLoading, error, refetch } = useCommunityPR(id);
const prDetail = computed(() => data.value);
const publishMutation = usePublishCommunityPR();
const wechatReminderSubscriptionQuery = useWeChatReminderSubscription();
const updateWechatReminderSubscriptionMutation =
  useUpdateWeChatReminderSubscription();
const userSessionStore = useUserSessionStore();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showLocationGalleryModal = ref(false);

const editableFields = computed<CommunityPRFormFields>(() => ({
  title: prDetail.value?.title,
  type: prDetail.value?.core.type ?? "",
  time: prDetail.value?.core.time ?? [null, null],
  location: prDetail.value?.core.location ?? null,
  minPartners: prDetail.value?.core.minPartners ?? null,
  maxPartners: prDetail.value?.core.maxPartners ?? null,
  partners: prDetail.value?.core.partners ?? [],
  budget: prDetail.value?.core.budget ?? null,
  preferences: prDetail.value?.core.preferences ?? [],
  notes: prDetail.value?.core.notes ?? null,
}));

const locationId = computed(() => {
  const location = prDetail.value?.core.location;
  if (!location) return null;
  const normalized = location.trim();
  return normalized.length > 0 ? normalized : null;
});
const poiIdsCsv = computed(() => (locationId.value ? locationId.value : null));
const { data: poisByIdsData } = usePoisByIds(poiIdsCsv);
const locationGallery = computed(() => {
  const targetLocationId = locationId.value;
  if (!targetLocationId) return [];
  const matchedPoi = (poisByIdsData.value ?? []).find(
    (poi) => poi.id === targetLocationId,
  );
  if (!matchedPoi) return [];
  return matchedPoi.gallery
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
});

watch(locationId, () => {
  showLocationGalleryModal.value = false;
});

useBodyScrollLock(
  computed(
    () =>
      showEditModal.value ||
      showModifyModal.value ||
      showLocationGalleryModal.value,
  ),
);

const isCreator = computed(() => {
  const createdBy = prDetail.value?.createdBy ?? null;
  if (!createdBy) return false;
  return userSessionStore.userId === createdBy;
});

const LIVE_POLL_INTERVAL_MS = 2_000;
const LIVE_POLL_MAX_ATTEMPTS = 10;
const livePollAttemptCount = ref(0);
const livePollTimerId = ref<number | null>(null);
const livePollInFlight = ref(false);
const stopLivePolling = () => {
  if (livePollTimerId.value !== null) {
    window.clearInterval(livePollTimerId.value);
    livePollTimerId.value = null;
  }
};
const tickLivePolling = async () => {
  if (id.value === null) return stopLivePolling();
  if (livePollAttemptCount.value >= LIVE_POLL_MAX_ATTEMPTS) {
    return stopLivePolling();
  }
  if (livePollInFlight.value) return;
  livePollAttemptCount.value += 1;
  livePollInFlight.value = true;
  try {
    await refetch();
  } finally {
    livePollInFlight.value = false;
    if (livePollAttemptCount.value >= LIVE_POLL_MAX_ATTEMPTS) {
      stopLivePolling();
    }
  }
};
const startLivePolling = () => {
  if (id.value === null || livePollTimerId.value !== null) return;
  livePollTimerId.value = window.setInterval(() => {
    void tickLivePolling();
  }, LIVE_POLL_INTERVAL_MS);
};
const resetLivePolling = () => {
  livePollAttemptCount.value = 0;
  if (id.value === null) return stopLivePolling();
  if (livePollTimerId.value === null) startLivePolling();
};

watch(
  id,
  (nextId) => {
    stopLivePolling();
    livePollAttemptCount.value = 0;
    livePollInFlight.value = false;
    if (nextId !== null) startLivePolling();
  },
  { immediate: true },
);
onBeforeUnmount(stopLivePolling);

const sharedActions = useSharedPRActions({
  id,
  pr: prDetail,
  isCreator,
  scenario: "COMMUNITY",
  onActionSuccess: resetLivePolling,
});

const isWeChatEnv = computed(() =>
  typeof navigator === "undefined" ? false : isWeChatBrowser(),
);
const reminderConfigured = computed(
  () => wechatReminderSubscriptionQuery.data.value?.configured ?? false,
);
const reminderAuthenticated = computed(
  () => wechatReminderSubscriptionQuery.data.value?.authenticated ?? false,
);
const reminderEnabled = computed(
  () => wechatReminderSubscriptionQuery.data.value?.enabled ?? false,
);
const reminderTogglePending = computed(
  () => updateWechatReminderSubscriptionMutation.isPending.value,
);
const canToggleReminder = computed(
  () =>
    isWeChatEnv.value &&
    reminderConfigured.value &&
    reminderAuthenticated.value &&
    !wechatReminderSubscriptionQuery.isLoading.value,
);
const reminderHintText = computed(() => {
  if (!isWeChatEnv.value) return t("prPage.wechatReminder.nonWechatHint");
  if (!reminderConfigured.value) {
    return t("prPage.wechatReminder.unconfiguredHint");
  }
  if (!reminderAuthenticated.value) return t("prPage.wechatReminder.loginHint");
  return reminderEnabled.value
    ? t("prPage.wechatReminder.enabledHint")
    : t("prPage.wechatReminder.disabledHint");
});

const handleToggleWechatReminder = async () => {
  if (id.value === null || !isWeChatEnv.value) return;
  if (!(await requireWeChatActionAuth(window.location.href))) return;

  await updateWechatReminderSubscriptionMutation.mutateAsync({
    enabled: !reminderEnabled.value,
  });
};

const handleGoWechatLogin = () => {
  if (typeof window === "undefined") return;
  redirectToWeChatOAuthLogin(window.location.href);
};

const creationEntry = computed(() => {
  const raw = route.query.entry;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const showPinHelpCard = computed(() => {
  if (!isCreator.value) return false;
  return creationEntry.value === "create" || creationEntry.value === "publish";
});

const handlePublishDraft = async () => {
  if (id.value === null) return;
  if (isWeChatEnv.value && typeof window !== "undefined") {
    void requireWeChatActionAuth(window.location.href);
  }
  const result = await publishMutation.mutateAsync({ id: id.value });
  const authPayload = (result as { auth?: AuthSessionPayload | null }).auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  await router.replace({ query: { ...route.query, entry: "publish" } });
  await refetch();
};

const { shareUrl, prShareData } = usePRShareContext({ id, pr: prDetail });

const formatDate = (dateStr: string) =>
  formatLocalDateTimeValue(dateStr) ?? dateStr;
const localizedTime = computed<[string | null, string | null]>(() =>
  formatLocalDateTimeWindow(prDetail.value?.core.time ?? [null, null]),
);

const handleEditSuccess = () => {
  showEditModal.value = false;
};
const goHome = () => {
  router.push("/");
};

const title = computed(() =>
  prDetail.value?.title
    ? t("prPage.metaTitleWithName", { title: prDetail.value.title })
    : t("prPage.metaFallbackTitle"),
);
const description = computed(
  () => prDetail.value?.core.type || t("prPage.metaFallbackDescription"),
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
</script>

<style lang="scss" scoped>
.surface-card {
  margin: var(--sys-spacing-lg) 0 0;
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.card-copy {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.pin-text {
  margin: 0;
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
}

.primary-button,
.secondary-button,
.link-button {
  border-radius: 999px;
  cursor: pointer;
}

.primary-button,
.secondary-button {
  @include mx.pu-font(label-medium);
}

.primary-button {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
}

.secondary-button {
  @include mx.pu-pill-action(outline-transparent, small);
}

.link-button {
  @include mx.pu-font(label-medium);
  border: none;
  padding: 0;
  margin-top: var(--sys-spacing-xs);
  color: var(--sys-color-primary);
  background: transparent;
  width: fit-content;
  cursor: pointer;
  text-decoration: underline;
}
</style>
