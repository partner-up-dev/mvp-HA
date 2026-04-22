<template>
  <PageScaffold class="anchor-pr-booking-support-page">
    <PageHeader
      :title="t('prBookingSupport.title')"
      :subtitle="t('prBookingSupport.subtitle')"
      :back-label="t('prBookingSupport.backToDetail')"
      :back-fallback-to="backFallbackTo"
    />

    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="bookingSupportDetail">
      <SurfaceCard class="card" gap="none">
        <h2 class="card-title">{{ bookingSupportDetail.bookingSupport.overview.title }}</h2>
        <p class="headline">
          {{
            bookingSupportDetail.bookingSupport.overview.headline ??
            t("prBookingSupport.overview.headlineFallback")
          }}
        </p>
        <p v-if="effectiveBookingDeadlineText" class="hint">
          {{
            t("prBookingSupport.overview.deadlineWithValue", {
              deadline: effectiveBookingDeadlineText,
            })
          }}
        </p>
        <div
          v-if="bookingSupportDetail.bookingSupport.overview.highlights.length > 0"
          class="tag-list"
        >
          <span
            v-for="highlight in bookingSupportDetail.bookingSupport.overview.highlights"
            :key="highlight"
            class="tag"
          >
            {{ highlight }}
          </span>
        </div>
      </SurfaceCard>

      <SurfaceCard
        v-if="
          bookingSupportDetail.bookingSupport.bookingContact.required &&
          bookingSupportDetail.bookingSupport.bookingContact.ownerIsCurrentViewer
        "
        class="card"
        gap="none"
      >
        <h2 class="card-title">{{ t("prBookingSupport.bookingContact.title") }}</h2>
        <p class="headline">{{ bookingContactHeadline }}</p>
        <p class="hint">{{ bookingContactHint }}</p>
        <p v-if="bookingContactDeadlineText" class="hint">
          {{
            t("prBookingSupport.bookingContact.deadlineWithValue", {
              deadline: bookingContactDeadlineText,
            })
          }}
        </p>

        <form
          v-if="canEditBookingContactPhone"
          class="phone-form"
          @submit.prevent="handleUpdateBookingContactPhone"
        >
          <input
            v-model.trim="bookingContactPhoneInput"
            class="phone-input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入 11 位大陆手机号"
          />
          <Button
            class="request-btn"
            appearance="pill"
            size="sm"
            type="submit"
            :disabled="updateBookingContactPhoneMutation.isPending.value"
          >
            {{
              updateBookingContactPhoneMutation.isPending.value
                ? t("prBookingSupport.bookingContact.verifying")
                : bookingContact?.state === "VERIFIED"
                  ? "更新手机号"
                  : t("prBookingSupport.bookingContact.verifyAction")
            }}
          </Button>
        </form>

        <p v-if="bookingContactVerifyErrorMessage" class="error-text">
          {{ bookingContactVerifyErrorMessage }}
        </p>
      </SurfaceCard>

      <SurfaceCard
        v-for="resource in bookingSupportDetail.bookingSupport.resources"
        :key="resource.id"
        class="card"
        gap="none"
      >
        <div class="resource-header">
          <div>
            <h2 class="card-title">{{ resource.title }}</h2>
            <p class="summary-text">{{ resource.summaryText }}</p>
          </div>
          <span class="kind-badge">
            {{ resourceKindText(resource.resourceKind) }}
          </span>
        </div>

        <div class="rows">
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.bookingRequired") }}</span>
            <span class="row-value">
              {{
                resource.booking.required
                  ? t("prBookingSupport.common.yes")
                  : t("prBookingSupport.common.no")
              }}
            </span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.bookingHandledBy") }}</span>
            <span class="row-value">{{ bookingHandledByText(resource.booking.handledBy) }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.bookingDeadline") }}</span>
            <span class="row-value">{{ formatDateTime(resource.booking.deadlineAt) }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.cancellationPolicy") }}</span>
            <span class="row-value">{{ resource.booking.cancellationPolicy || t("prBookingSupport.common.notSet") }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.settlementMode") }}</span>
            <span class="row-value">{{ settlementModeText(resource.support.settlementMode) }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prBookingSupport.resource.transferToPlatform") }}</span>
            <span class="row-value">
              {{
                resource.support.requiresUserTransferToPlatform
                  ? t("prBookingSupport.common.yes")
                  : t("prBookingSupport.common.no")
              }}
            </span>
          </div>
        </div>

        <ul v-if="resourceFlowNotes(resource).length > 0" class="rules-list">
          <li
            v-for="note in resourceFlowNotes(resource)"
            :key="note"
            class="rule-item"
          >
            {{ note }}
          </li>
        </ul>

        <ul v-if="resource.detailRules.length > 0" class="rules-list">
          <li v-for="rule in resource.detailRules" :key="rule" class="rule-item">
            {{ rule }}
          </li>
        </ul>
      </SurfaceCard>

      <SurfaceCard
        v-if="showReimbursementSection"
        class="card reimbursement-card"
        gap="none"
      >
        <h2 class="card-title">{{ t("prBookingSupport.reimbursement.title") }}</h2>

        <div v-if="reimbursementQuery.isLoading.value" class="hint">
          {{ t("common.loading") }}
        </div>
        <ErrorToast
          v-else-if="reimbursementQuery.error.value"
          :message="reimbursementQuery.error.value.message"
          persistent
        />
        <template v-else-if="reimbursement">
          <div class="rows">
            <div class="row">
              <span class="row-label">{{ t("prBookingSupport.reimbursement.eligibility") }}</span>
              <span class="row-value">
                {{
                  reimbursement.eligible
                    ? t("prBookingSupport.reimbursement.eligible")
                    : t("prBookingSupport.reimbursement.ineligible")
                }}
              </span>
            </div>
            <div class="row">
              <span class="row-label">{{ t("prBookingSupport.reimbursement.status") }}</span>
              <span class="row-value">
                {{ reimbursementStatusText(reimbursement.reimbursementStatus) }}
              </span>
            </div>
            <div class="row">
              <span class="row-label">{{ t("prBookingSupport.reimbursement.amount") }}</span>
              <span class="row-value">{{ formatCurrency(reimbursement.reimbursementAmount) }}</span>
            </div>
          </div>

          <p v-if="reimbursement.reason" class="hint">
            {{ reimbursementReasonText(reimbursement.reason) }}
          </p>

          <SurfaceCard
            v-if="bookingSupportDetail.status === 'CLOSED'"
            class="reimburse-prompt-card"
            tone="inset-high"
            gap="none"
          >
            <p class="reimburse-prompt-title">
              {{ t("prBookingSupport.reimbursement.promptTitle") }}
            </p>
            <p class="reimburse-prompt-desc">
              {{ t("prBookingSupport.reimbursement.promptDesc") }}
            </p>
            <Button
              class="request-btn"
              appearance="pill"
              size="sm"
              type="button"
              @click="showWecomQrModal = true"
            >
              {{ t("prBookingSupport.reimbursement.openWecomQr") }}
            </Button>
          </SurfaceCard>
        </template>
      </SurfaceCard>
    </template>

    <Modal
      :open="showWecomQrModal"
      :title="t('prBookingSupport.reimbursement.wecomModalTitle')"
      @close="showWecomQrModal = false"
    >
      <div class="wecom-modal-content">
        <img
          v-if="wecomQrCodeUrl"
          :src="wecomQrCodeUrl"
          :alt="t('prBookingSupport.reimbursement.wecomQrAlt')"
          class="wecom-qr-image"
        />
        <p v-else class="hint">
          {{ t("prBookingSupport.reimbursement.wecomQrMissing") }}
        </p>
      </div>
    </Modal>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import Button from "@/shared/ui/actions/Button.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import {
  useAnchorPRBookingSupport,
  useAnchorReimbursementStatus,
  useUpdateAnchorPRBookingContactPhone,
} from "@/domains/pr/queries/useAnchorPR";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type BookingHandledBy = "PLATFORM" | "PLATFORM_PASSTHROUGH" | "USER";

const route = useRoute();
const { t, locale } = useI18n();

const id = computed<PRId | null>(() => {
  const rawId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed as PRId) : null;
});
const backFallbackTo = computed(() => {
  if (id.value !== null) {
    return prDetailPath(id.value);
  }
  return "/";
});

const { data, isLoading, error } = useAnchorPRBookingSupport(id);
const bookingSupportDetail = computed(() => data.value);
const reimbursementQuery = useAnchorReimbursementStatus(id);
const reimbursement = computed(() => reimbursementQuery.data.value ?? null);
const wecomQrCodeQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.wecomServiceQrCode);
const wecomQrCodeUrl = computed(() => wecomQrCodeQuery.data.value?.value ?? null);
const showWecomQrModal = ref(false);
const updateBookingContactPhoneMutation = useUpdateAnchorPRBookingContactPhone();
const bookingContactVerifyErrorMessage = ref<string | null>(null);
const bookingContactPhoneInput = ref("");
const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;

const showReimbursementSection = computed(() =>
  bookingSupportDetail.value?.bookingSupport.resources.some(
    (resource) => resource.support.settlementMode === "PLATFORM_POSTPAID",
  ) ?? false,
);
const bookingContact = computed(
  () => bookingSupportDetail.value?.bookingSupport.bookingContact ?? null,
);
const canEditBookingContactPhone = computed(
  () =>
    Boolean(
      id.value !== null &&
        bookingContact.value?.required &&
        bookingContact.value.ownerIsCurrentViewer,
    ),
);

const formatDateTime = (value: string | null | undefined): string => {
  return formatLocalDateTimeValue(value) ?? t("prBookingSupport.common.notSet");
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return t("prBookingSupport.common.notSet");
  }
  return new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
};

const effectiveBookingDeadlineText = computed(() => {
  const deadline =
    bookingSupportDetail.value?.bookingSupport.overview.effectiveBookingDeadlineAt ??
    null;
  return deadline ? formatDateTime(deadline) : null;
});
const bookingContactDeadlineText = computed(() => {
  const deadline = bookingContact.value?.deadlineAt ?? null;
  return deadline ? formatDateTime(deadline) : null;
});
const bookingContactHeadline = computed(() => {
  const current = bookingContact.value;
  if (!current?.required) return "";
  if (current.state === "VERIFIED" && current.maskedPhone) {
    return t("prBookingSupport.bookingContact.stateVerifiedWithPhone", {
      phone: current.maskedPhone,
    });
  }
  if (current.state === "VERIFIED") {
    return t("prBookingSupport.bookingContact.stateVerified");
  }
  if (current.ownerIsCurrentViewer) {
    return t("prBookingSupport.bookingContact.stateMissingOwnerSelf");
  }
  return t("prBookingSupport.bookingContact.stateMissingOwnerOther");
});
const bookingContactHint = computed(() => {
  const current = bookingContact.value;
  if (!current?.required) return "";
  if (current.state === "VERIFIED") {
    return t("prBookingSupport.bookingContact.verifiedHint");
  }
  if (current.ownerIsCurrentViewer) {
    return t("prBookingSupport.bookingContact.ownerSelfHint");
  }
  return t("prBookingSupport.bookingContact.ownerOtherHint");
});

const resourceKindText = (
  kind: "VENUE" | "ITEM" | "SERVICE" | "OTHER",
): string => {
  if (kind === "VENUE") return t("prBookingSupport.resource.kindVenue");
  if (kind === "ITEM") return t("prBookingSupport.resource.kindItem");
  if (kind === "SERVICE") return t("prBookingSupport.resource.kindService");
  return t("prBookingSupport.resource.kindOther");
};

const bookingHandledByText = (
  handledBy: BookingHandledBy | null,
): string => {
  if (handledBy === "PLATFORM") {
    return t("prBookingSupport.resource.handledByPlatform");
  }
  if (handledBy === "PLATFORM_PASSTHROUGH") {
    return t("prBookingSupport.resource.handledByPlatformPassthrough");
  }
  if (handledBy === "USER") {
    return t("prBookingSupport.resource.handledByUser");
  }
  return t("prBookingSupport.common.notSet");
};

const settlementModeText = (
  mode: "NONE" | "PLATFORM_PREPAID" | "PLATFORM_POSTPAID",
): string => {
  if (mode === "PLATFORM_PREPAID") {
    return t("prBookingSupport.resource.settlementPrepaid");
  }
  if (mode === "PLATFORM_POSTPAID") {
    return t("prBookingSupport.resource.settlementPostpaid");
  }
  return t("prBookingSupport.resource.settlementNone");
};

const reimbursementStatusText = (
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "PAID",
): string => {
  if (status === "NONE") return t("prBookingSupport.reimbursement.statusNone");
  if (status === "PENDING") return t("prBookingSupport.reimbursement.statusPending");
  if (status === "APPROVED") return t("prBookingSupport.reimbursement.statusApproved");
  if (status === "REJECTED") return t("prBookingSupport.reimbursement.statusRejected");
  return t("prBookingSupport.reimbursement.statusPaid");
};

const reimbursementReasonText = (
  reason:
    | "NO_POSTPAID_SUPPORT"
    | "PR_NOT_CLOSED"
    | "SLOT_NOT_ELIGIBLE"
    | "ALREADY_REQUESTED",
): string => {
  if (reason === "NO_POSTPAID_SUPPORT") {
    return t("prBookingSupport.reimbursement.reasonNoPostpaidSupport");
  }
  if (reason === "PR_NOT_CLOSED") {
    return t("prBookingSupport.reimbursement.reasonPrNotClosed");
  }
  if (reason === "SLOT_NOT_ELIGIBLE") {
    return t("prBookingSupport.reimbursement.reasonSlotNotEligible");
  }
  return t("prBookingSupport.reimbursement.reasonAlreadyRequested");
};

const validateBookingContactPhoneInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "请输入手机号";
  }
  if (!CN_MAINLAND_MOBILE_REGEX.test(trimmed)) {
    return "请输入 11 位大陆手机号";
  }
  return null;
};

const handleUpdateBookingContactPhone = async () => {
  if (id.value === null || !canEditBookingContactPhone.value) return;

  bookingContactVerifyErrorMessage.value = null;
  const phoneInputError = validateBookingContactPhoneInput(
    bookingContactPhoneInput.value,
  );
  if (phoneInputError) {
    bookingContactVerifyErrorMessage.value = phoneInputError;
    return;
  }

  try {
    await updateBookingContactPhoneMutation.mutateAsync({
      id: id.value,
      phone: bookingContactPhoneInput.value.trim(),
    });
    bookingContactPhoneInput.value = "";
    bookingContactVerifyErrorMessage.value = null;
  } catch (error) {
    bookingContactVerifyErrorMessage.value =
      error instanceof Error
        ? error.message
        : t("prBookingSupport.bookingContact.verifyFailed");
  }
};

type BookingSupportResource =
  NonNullable<
    NonNullable<typeof bookingSupportDetail.value>["bookingSupport"]["resources"]
  >[number];

const resourceFlowNotes = (resource: BookingSupportResource): string[] => {
  const notes: string[] = [];

  if (!resource.booking.required) {
    notes.push(t("prBookingSupport.resource.flowNoBooking"));
  } else if (resource.booking.handledBy === "PLATFORM") {
    notes.push(t("prBookingSupport.resource.flowPlatformBooks"));
  } else if (resource.booking.handledBy === "PLATFORM_PASSTHROUGH") {
    notes.push(t("prBookingSupport.resource.flowPlatformPassthroughBooks"));
  } else if (resource.booking.handledBy === "USER") {
    notes.push(t("prBookingSupport.resource.flowUserBooks"));
  }

  if (resource.booking.required && resource.booking.deadlineAt) {
    notes.push(
      t("prBookingSupport.resource.flowBookingDeadline", {
        deadline: formatDateTime(resource.booking.deadlineAt),
      }),
    );
  }

  if (resource.booking.required && resource.booking.locksParticipant) {
    notes.push(t("prBookingSupport.resource.flowLocksParticipant"));
  }

  if (resource.support.settlementMode === "PLATFORM_PREPAID") {
    notes.push(t("prBookingSupport.resource.flowSettlementPrepaid"));
  }
  if (resource.support.settlementMode === "PLATFORM_POSTPAID") {
    notes.push(t("prBookingSupport.resource.flowSettlementPostpaid"));
  }

  if (resource.support.requiresUserTransferToPlatform) {
    notes.push(t("prBookingSupport.resource.flowTransferToPlatform"));
  }

  return notes;
};
</script>

<style lang="scss" scoped>
.card {
  margin-top: var(--sys-spacing-med);
}

.card-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.headline,
.summary-text {
  margin: var(--sys-spacing-xs) 0 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}

.hint {
  margin: var(--sys-spacing-xs) 0 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.error-text {
  margin: var(--sys-spacing-xs) 0 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
  margin-top: var(--sys-spacing-sm);
}

.tag {
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-surface-container-high);
  @include mx.pu-font(body-small);
}

.resource-header {
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  align-items: flex-start;
}

.kind-badge {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  margin-top: var(--sys-spacing-sm);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-med);
}

.row-label {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.row-value {
  text-align: right;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}

.rules-list {
  margin: var(--sys-spacing-sm) 0 0;
  padding-left: 1.1rem;
}

.rule-item {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}

.request-btn {
  margin-top: var(--sys-spacing-sm);
}

.phone-form {
  margin-top: var(--sys-spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.phone-input {
  width: min(100%, 280px);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  @include mx.pu-font(body-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.reimburse-prompt-card {
  margin-top: var(--sys-spacing-sm);
}

.reimburse-prompt-title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.reimburse-prompt-desc {
  margin: var(--sys-spacing-xs) 0 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.wecom-modal-content {
  display: flex;
  justify-content: center;
}

.wecom-qr-image {
  width: min(100%, 280px);
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: var(--sys-radius-sm);
}
</style>
