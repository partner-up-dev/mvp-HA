<template>
  <Button
    v-if="props.qrEntry"
    v-bind="attrs"
    type="button"
    appearance="pill"
    :tone="props.tone"
    @click="$emit('openQr')"
  >
    <slot />
  </Button>
  <ActionLink
    v-else
    v-bind="attrs"
    :href="props.href"
    external
    appearance="pill"
    :tone="props.tone"
  >
    <slot />
  </ActionLink>
</template>

<script setup lang="ts">
import { useAttrs } from "vue";
import Button from "@/shared/ui/actions/Button.vue";
import ActionLink from "@/shared/ui/actions/ActionLink.vue";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    href: string;
    qrEntry?: boolean;
    tone?: "primary" | "secondary";
  }>(),
  {
    qrEntry: false,
    tone: "primary",
  },
);

defineEmits<{
  openQr: [];
}>();

const attrs = useAttrs();
</script>
