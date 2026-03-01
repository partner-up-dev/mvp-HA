<template>
  <div class="pr-economy-page">
    <header class="page-header">
      <router-link
        v-if="id !== null"
        :to="{ name: 'pr', params: { id } }"
        class="back-link"
      >
        {{ t("prEconomy.backToDetail") }}
      </router-link>
      <h1 class="page-title">{{ t("prEconomy.title") }}</h1>
      <p class="page-subtitle">{{ t("prEconomy.subtitle") }}</p>
    </header>

    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <section class="card">
        <h2 class="card-title">{{ t("prEconomy.model.title") }}</h2>
        <div class="rows">
          <div class="row">
            <span class="row-label">{{ t("prEconomy.model.paymentModel") }}</span>
            <span class="row-value">{{ paymentModelText }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prEconomy.model.discountRate") }}</span>
            <span class="row-value">{{ discountRateText }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prEconomy.model.subsidyCap") }}</span>
            <span class="row-value">{{ subsidyCapText }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prEconomy.model.policyScope") }}</span>
            <span class="row-value">{{ policyScopeText }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">{{ t("prEconomy.booking.title") }}</h2>
        <div class="rows">
          <div class="row">
            <span class="row-label">{{ t("prEconomy.booking.deadline") }}</span>
            <span class="row-value">{{ bookingDeadlineText }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prEconomy.booking.lockState") }}</span>
            <span class="row-value">{{ bookingLockText }}</span>
          </div>
          <div class="row">
            <span class="row-label">{{ t("prEconomy.booking.cancellationPolicy") }}</span>
            <span class="row-value">{{ cancellationPolicyText }}</span>
          </div>
        </div>
      </section>

      <section
        v-if="prDetail.paymentModelApplied === 'A'"
        class="card reimbursement-card"
      >
        <h2 class="card-title">{{ t("prEconomy.reimbursement.title") }}</h2>

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
              <span class="row-label">{{
                t("prEconomy.reimbursement.eligibility")
              }}</span>
              <span class="row-value">{{
                reimbursement.eligible
                  ? t("prEconomy.reimbursement.eligible")
                  : t("prEconomy.reimbursement.ineligible")
              }}</span>
            </div>
            <div class="row">
              <span class="row-label">{{
                t("prEconomy.reimbursement.status")
              }}</span>
              <span class="row-value">{{
                reimbursementStatusText(reimbursement.reimbursementStatus)
              }}</span>
            </div>
            <div class="row">
              <span class="row-label">{{
                t("prEconomy.reimbursement.amount")
              }}</span>
              <span class="row-value">{{ reimbursementAmountText }}</span>
            </div>
          </div>

          <p v-if="reimbursement.reason" class="hint">
            {{ reimbursementReasonText(reimbursement.reason) }}
          </p>

          <div
            v-if="prDetail.status === 'CLOSED'"
            class="reimburse-prompt-card"
          >
            <p class="reimburse-prompt-title">
              {{ t("prEconomy.reimbursement.promptTitle") }}
            </p>
            <p class="reimburse-prompt-desc">
              {{ t("prEconomy.reimbursement.promptDesc") }}
            </p>
            <button class="request-btn" @click="showWecomQrModal = true">
              {{ t("prEconomy.reimbursement.openWecomQr") }}
            </button>
          </div>

          <div class="wecom-box">
            <p class="wecom-title">{{ t("prEconomy.reimbursement.wecomTitle") }}</p>
            <p class="wecom-desc">{{ t("prEconomy.reimbursement.wecomDesc") }}</p>
          </div>
        </template>
      </section>
    </template>

    <Modal
      :open="showWecomQrModal"
      :title="t('prEconomy.reimbursement.wecomModalTitle')"
      @close="showWecomQrModal = false"
    >
      <div class="wecom-modal-content">
        <img
          v-if="wecomQrCodeUrl"
          :src="wecomQrCodeUrl"
          :alt="t('prEconomy.reimbursement.wecomQrAlt')"
          class="wecom-qr-image"
        />
        <p v-else class="hint">
          {{ t("prEconomy.reimbursement.wecomQrMissing") }}
        </p>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/components/common/LoadingIndicator.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import Modal from "@/components/common/Modal.vue";
import { usePR } from "@/queries/usePR";
import { useReimbursementStatus } from "@/queries/useReimbursementStatus";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/queries/usePublicConfig";
import type { PRDetailView } from "@/entities/pr/types";

const route = useRoute();
const { t, locale } = useI18n();

const id = computed<PRId | null>(() => {
  const rawId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed as PRId) : null;
});

const { data, isLoading, error } = usePR(id);
const prDetail = computed(() => data.value as PRDetailView | undefined);

const reimbursementQuery = useReimbursementStatus(id);
const wecomQrCodeQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.wecomServiceQrCode);
const showWecomQrModal = ref(false);

const reimbursement = computed(() => reimbursementQuery.data.value ?? null);
const wecomQrCodeUrl = computed(() => wecomQrCodeQuery.data.value?.value ?? null);

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return t("prEconomy.common.notSet");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("prEconomy.common.notSet");
  return date.toLocaleString(locale.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return t("prEconomy.common.notSet");
  return new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDiscountRate = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return t("prEconomy.common.notSet");
  return `${(value * 100).toFixed(0)}%`;
};

const paymentModelText = computed(() => {
  if (prDetail.value?.paymentModelApplied === "A") {
    return t("prEconomy.model.modelA");
  }
  if (prDetail.value?.paymentModelApplied === "C") {
    return t("prEconomy.model.modelC");
  }
  return t("prEconomy.common.notSet");
});

const discountRateText = computed(() =>
  formatDiscountRate(prDetail.value?.discountRateApplied),
);

const subsidyCapText = computed(() =>
  formatCurrency(prDetail.value?.subsidyCapApplied),
);

const policyScopeText = computed(() => {
  const scope = prDetail.value?.economicPolicyScopeApplied;
  if (scope === "BATCH_OVERRIDE") {
    return t("prEconomy.model.scopeBatchOverride");
  }
  if (scope === "EVENT_DEFAULT") {
    return t("prEconomy.model.scopeEventDefault");
  }
  return t("prEconomy.common.notSet");
});

const bookingDeadlineText = computed(() =>
  formatDateTime(prDetail.value?.resourceBookingDeadlineAt),
);

const isDeadlinePassed = computed(() => {
  const deadline = prDetail.value?.resourceBookingDeadlineAt;
  if (!deadline) return false;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() >= date.getTime();
});

const bookingLockText = computed(() => {
  if (prDetail.value?.status === "LOCKED_TO_START") {
    return t("prEconomy.booking.locked");
  }
  if (isDeadlinePassed.value) {
    return t("prEconomy.booking.passed");
  }
  return t("prEconomy.booking.notLocked");
});

const cancellationPolicyText = computed(() =>
  prDetail.value?.cancellationPolicyApplied || t("prEconomy.common.notSet"),
);

const reimbursementAmountText = computed(() =>
  formatCurrency(reimbursement.value?.reimbursementAmount),
);

const reimbursementStatusText = (
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "PAID",
): string => {
  if (status === "NONE") return t("prEconomy.reimbursement.statusNone");
  if (status === "PENDING") return t("prEconomy.reimbursement.statusPending");
  if (status === "APPROVED") return t("prEconomy.reimbursement.statusApproved");
  if (status === "REJECTED") return t("prEconomy.reimbursement.statusRejected");
  return t("prEconomy.reimbursement.statusPaid");
};

const reimbursementReasonText = (
  reason: "MODEL_NOT_REIMBURSEMENT" | "PR_NOT_CLOSED" | "SLOT_NOT_ELIGIBLE" | "ALREADY_REQUESTED",
): string => {
  if (reason === "MODEL_NOT_REIMBURSEMENT") {
    return t("prEconomy.reimbursement.reasonModelNotA");
  }
  if (reason === "PR_NOT_CLOSED") {
    return t("prEconomy.reimbursement.reasonPrNotClosed");
  }
  if (reason === "SLOT_NOT_ELIGIBLE") {
    return t("prEconomy.reimbursement.reasonSlotNotEligible");
  }
  return t("prEconomy.reimbursement.reasonAlreadyRequested");
};
</script>

<style lang="scss" scoped>
.pr-economy-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.page-header {
  margin-bottom: var(--sys-spacing-lg);
}

.back-link {
  display: inline-block;
  margin-bottom: var(--sys-spacing-xs);
  color: var(--sys-color-primary);
  text-decoration: none;
  font-size: 0.875rem;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.page-subtitle {
  margin: 0.4rem 0 0;
  color: var(--sys-color-on-surface-variant);
  font-size: 0.875rem;
}

.card {
  margin-top: var(--sys-spacing-med);
  padding: var(--sys-spacing-med);
  border-radius: 12px;
  background: var(--sys-color-surface-container);
}

.card-title {
  margin: 0 0 var(--sys-spacing-sm);
  font-size: 1rem;
  font-weight: 600;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.row-label {
  color: var(--sys-color-on-surface-variant);
  font-size: 0.8125rem;
}

.row-value {
  text-align: right;
  font-size: 0.875rem;
  color: var(--sys-color-on-surface);
}

.hint {
  margin: var(--sys-spacing-sm) 0 0;
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
}

.request-btn {
  margin-top: var(--sys-spacing-sm);
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.reimburse-prompt-card {
  margin-top: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
  border-radius: 10px;
  background: var(--sys-color-surface-container-high);
}

.reimburse-prompt-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.reimburse-prompt-desc {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
}

.wecom-box {
  margin-top: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
  border-radius: 10px;
  border: 1px solid var(--sys-color-outline-variant);
}

.wecom-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.wecom-desc {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
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
  border-radius: 10px;
}
</style>
