<template>
  <SharedPRActionsBar
    :can-join="canJoin"
    :can-exit="canExit"
    :has-joined="hasJoined"
    :is-creator="isCreator"
    :show-edit-content-action="showEditContentAction"
    :show-modify-status-action="showModifyStatusAction"
    :slot-state-text="slotStateText"
    :join-pending="joinPending"
    :exit-pending="exitPending"
    @join="emit('join')"
    @exit="emit('exit')"
    @edit-content="emit('edit-content')"
    @modify-status="emit('modify-status')"
  />
</template>

<script setup lang="ts">
import SharedPRActionsBar from "@/domains/pr/ui/sections/SharedPRActionsBar.vue";

defineProps<{
  canJoin: boolean;
  canExit: boolean;
  hasJoined: boolean;
  isCreator: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  slotStateText: string;
  joinPending: boolean;
  exitPending: boolean;
}>();

const emit = defineEmits<{
  join: [];
  exit: [];
  "edit-content": [];
  "modify-status": [];
}>();
</script>
