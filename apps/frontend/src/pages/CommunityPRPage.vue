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
        :show-partners="false"
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

      <PRPartnerSection
        :section="prDetail.partnerSection"
        :slot-state-text="sharedActions.slotStateText.value"
        :join-pending="sharedActions.joinPending.value"
        :exit-pending="sharedActions.exitPending.value"
        @join="handleJoin"
        @exit="sharedActions.handleExit"
      />

      <CommunityPRActionsBar
        :can-join="false"
        :can-exit="false"
        :has-joined="false"
        :is-creator="isCreator"
        :show-edit-content-action="sharedActions.showEditContentAction.value"
        :show-modify-status-action="sharedActions.showModifyStatusAction.value"
        slot-state-text=""
        :join-pending="false"
        :exit-pending="false"
        @edit-content="showEditModal = true"
        @modify-status="showModifyModal = true"
      />

      <PRShareSection
        v-if="prShareData && id !== null"
        :pr-id="id"
        :share-url="shareUrl"
        :spm-route-key="spmRouteKey"
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
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
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
import PRPartnerSection from "@/domains/pr/ui/sections/PRPartnerSection.vue";
import {
  useCommunityPR,
  usePublishCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import type { CommunityPRFormFields } from "@/domains/pr/model/types";
import type { JoinCommunityPRResponse } from "@/domains/pr/queries/useCommunityPR";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindow,
} from "@/shared/datetime/formatLocalDateTime";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();

const { data, isLoading, error, refetch } = useCommunityPR(id);
const prDetail = computed(() => data.value);
const publishMutation = usePublishCommunityPR();
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

const { locationId, locationGallery } = usePRLocationGallery(
  computed(() => prDetail.value?.core.location ?? null),
);

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

const { resetLivePolling } = usePRLivePolling({
  id,
  refetch,
});

const sharedActions = useSharedPRActions({
  id,
  pr: prDetail,
  isCreator,
  scenario: "COMMUNITY",
  onActionSuccess: resetLivePolling,
});

const creationEntry = computed(() => {
  const raw = route.query.entry;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const showPinHelpCard = computed(() => {
  if (creationEntry.value === "join") {
    return Boolean(userSessionStore.userPin);
  }
  if (!isCreator.value) return false;
  return creationEntry.value === "create" || creationEntry.value === "publish";
});

const handlePublishDraft = async () => {
  if (id.value === null) return;
  const result = await publishMutation.mutateAsync({ id: id.value });
  const authPayload = (result as { auth?: AuthSessionPayload | null }).auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  await router.replace({ query: { ...route.query, entry: "publish" } });
  await refetch();
};

const handleJoin = async () => {
  const result = await sharedActions.handleJoin();
  const authPayload = (result as JoinCommunityPRResponse | undefined)?.auth;
  if (!authPayload) return;

  userSessionStore.applyAuthSession(authPayload);
  if (authPayload.userPin) {
    await router.replace({ query: { ...route.query, entry: "join" } });
  }
};

const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});
usePRDetailHead({ pr: prDetail, shareUrl });

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
</script>

<style lang="scss" scoped>
.surface-card {
  margin: var(--sys-spacing-lg) 0;
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
