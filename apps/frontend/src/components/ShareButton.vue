<template>
  <button class="share-button" @click="handleShare">
    {{ copied ? "已复制!" : "分享链接" }}
  </button>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  url: string;
}>();

const copied = ref(false);

const handleShare = async () => {
  try {
    // Try native share first (mobile)
    if (navigator.share) {
      await navigator.share({
        title: "搭一把",
        url: props.url,
      });
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(props.url);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }
  } catch (err) {
    console.error("Share failed:", err);
  }
};
</script>

<style lang="scss" scoped>
.share-button {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  border: none;
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
  }
}
</style>
