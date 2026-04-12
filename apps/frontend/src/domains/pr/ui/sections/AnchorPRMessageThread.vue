<template>
  <SurfaceCard class="message-thread" tone="outline" gap="sm">
    <header class="message-thread__header">
      <h2 class="message-thread__title">
        {{ t("prPage.messageThread.title") }}
      </h2>
      <p class="message-thread__subtitle">
        {{ t("prPage.messageThread.subtitle") }}
      </p>
    </header>

    <InlineNotice
      tone="info"
      :message="t('prPage.messageThread.nonRealtimeHint')"
    />

    <InlineNotice
      v-if="messagesQuery.error.value"
      tone="error"
      :message="messagesQuery.error.value.message"
    />

    <template v-else>
      <p v-if="messagesQuery.isLoading.value" class="message-thread__loading">
        {{ t("common.loading") }}
      </p>

      <EmptyState
        v-else-if="threadItems.length === 0"
        :title="t('prPage.messageThread.emptyTitle')"
        :description="t('prPage.messageThread.emptyDescription')"
        icon="i-mdi-message-text-outline"
        tone="section"
        align="start"
      />

      <ul v-else class="message-list">
        <li
          v-for="item in threadItems"
          :key="item.id"
          class="message-list__item"
        >
          <div class="message-list__meta">
            <span class="message-list__author">
              {{ resolveAuthorName(item.author.nickname) }}
            </span>
            <time class="message-list__time" :datetime="item.createdAt">
              {{ formatMessageTime(item.createdAt) }}
            </time>
          </div>
          <p class="message-list__body">
            {{ item.body }}
          </p>
        </li>
      </ul>
    </template>

    <InlineNotice
      v-if="submitError"
      tone="error"
      :message="submitError"
    />
    <InlineNotice
      v-if="readMarkerError"
      tone="warning"
      :message="readMarkerError"
    />

    <FormField
      :label="t('prPage.messageThread.inputLabel')"
      :hint="t('prPage.messageThread.inputHint')"
      for-id="anchor-pr-message-input"
    >
      <textarea
        id="anchor-pr-message-input"
        v-model.trim="draftBody"
        class="message-thread__input"
        rows="3"
        maxlength="1000"
        :placeholder="t('prPage.messageThread.inputPlaceholder')"
      />
    </FormField>

    <div class="message-thread__actions">
      <Button
        tone="primary"
        :loading="createMessageMutation.isPending.value"
        :disabled="!canSubmitMessage"
        @click="handleSubmitMessage"
      >
        {{
          createMessageMutation.isPending.value
            ? t("prPage.messageThread.submittingAction")
            : t("prPage.messageThread.submitAction")
        }}
      </Button>
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import EmptyState from "@/shared/ui/feedback/EmptyState.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import {
  useAdvanceAnchorPRMessageReadMarker,
  useAnchorPRMessages,
  useCreateAnchorPRMessage,
} from "@/domains/pr/queries/useAnchorPRMessages";

const props = defineProps<{
  prId: PRId;
}>();

const { t } = useI18n();
const draftBody = ref("");
const submitError = ref<string | null>(null);
const readMarkerError = ref<string | null>(null);
const lastReadAdvanceRequestId = ref<number | null>(null);

const prIdRef = computed(() => props.prId);
const messagesQuery = useAnchorPRMessages(prIdRef);
const createMessageMutation = useCreateAnchorPRMessage();
const advanceReadMarkerMutation = useAdvanceAnchorPRMessageReadMarker();

const threadItems = computed(() => messagesQuery.data.value?.items ?? []);
const thread = computed(() => messagesQuery.data.value?.thread ?? null);

const canSubmitMessage = computed(() => {
  if (!thread.value?.canPost) return false;
  if (createMessageMutation.isPending.value) return false;
  return draftBody.value.trim().length > 0;
});

watch(draftBody, () => {
  submitError.value = null;
});

watch(
  () =>
    [
      thread.value?.latestVisibleMessageId ?? null,
      thread.value?.lastReadMessageId ?? null,
      messagesQuery.isLoading.value,
      advanceReadMarkerMutation.isPending.value,
    ] as const,
  ([latestVisibleMessageId, lastReadMessageId, isLoading, isMarkingRead]) => {
    if (isLoading || isMarkingRead || latestVisibleMessageId === null) return;
    if (
      lastReadMessageId !== null &&
      latestVisibleMessageId <= lastReadMessageId
    ) {
      return;
    }
    if (lastReadAdvanceRequestId.value === latestVisibleMessageId) {
      return;
    }

    lastReadAdvanceRequestId.value = latestVisibleMessageId;
    readMarkerError.value = null;
    void advanceReadMarkerMutation
      .mutateAsync({
        id: props.prId,
        lastReadMessageId: latestVisibleMessageId,
      })
      .catch((error: unknown) => {
        readMarkerError.value =
          error instanceof Error
            ? error.message
            : t("common.operationFailed");
      });
  },
  { immediate: true },
);

const resolveAuthorName = (nickname: string | null): string => {
  const normalized = nickname?.trim();
  if (normalized) return normalized;
  return t("prPage.messageThread.authorFallback");
};

const formatMessageTime = (iso: string): string => {
  return formatLocalDateTimeValue(iso) ?? iso;
};

const handleSubmitMessage = async () => {
  if (!canSubmitMessage.value) return;

  const body = draftBody.value.trim();
  if (!body) return;

  submitError.value = null;
  try {
    await createMessageMutation.mutateAsync({
      id: props.prId,
      body,
    });
    draftBody.value = "";
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};
</script>

<style scoped lang="scss">
.message-thread {
  width: 100%;
}

.message-thread__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
}

.message-thread__title,
.message-thread__subtitle {
  margin: 0;
}

.message-thread__title {
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface);
}

.message-thread__subtitle {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.message-thread__loading {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.message-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.message-list__item {
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-lowest);
}

.message-list__meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sys-spacing-sm);
}

.message-list__author {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface);
}

.message-list__time {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.message-list__body {
  margin: var(--sys-spacing-xs) 0 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-thread__input {
  @include mx.pu-field-shell;
  min-height: 5.5rem;
  resize: vertical;
}

.message-thread__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 375px) {
  .message-list__meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sys-spacing-2xs);
  }
}
</style>
