<template>
  <Modal
    :open="open"
    :title="questionnaire?.title ?? '活动反馈'"
    @close="$emit('close')"
  >
    <FeedbackQuestionnaireForm
      v-if="questionnaire"
      :instance-id="questionnaire.instanceId"
      :definition="questionnaire.definition"
      :pending="pending"
      @submit="$emit('submit', $event)"
      @cancel="$emit('close')"
    />
  </Modal>
</template>

<script setup lang="ts">
import type { FeedbackQuestionnaireAnswers } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import Modal from "@/shared/ui/overlay/Modal.vue";
import FeedbackQuestionnaireForm from "@/domains/feedback/ui/FeedbackQuestionnaireForm.vue";

defineProps<{
  open: boolean;
  questionnaire: PRDetailView["feedbackQuestionnaire"];
  pending: boolean;
}>();

defineEmits<{
  close: [];
  submit: [answers: FeedbackQuestionnaireAnswers];
}>();
</script>
