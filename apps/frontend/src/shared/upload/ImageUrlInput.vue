<template>
  <div class="image-url-input">
    <input
      ref="fileInputRef"
      class="image-url-input__file"
      type="file"
      :accept="accept"
      :disabled="disabled || isUploading"
      @change="handleFileChange"
    />

    <div class="image-url-input__row">
      <input
        :id="inputId"
        class="image-url-input__text"
        type="url"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="handleUrlInput"
      />
      <Button
        appearance="pill"
        tone="outline"
        size="sm"
        type="button"
        :disabled="disabled || isUploading"
        :loading="isUploading"
        @click="handlePickImage"
      >
        {{ isUploading ? uploadingLabel : uploadLabel }}
      </Button>
    </div>

    <img
      v-if="previewUrl"
      class="image-url-input__preview"
      :src="previewUrl"
      :alt="previewAlt"
    />

    <p v-if="uploadError" class="image-url-input__error">
      {{ uploadError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ImageUploadPurpose } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    inputId: string;
    purpose: ImageUploadPurpose;
    placeholder?: string;
    uploadLabel: string;
    uploadingLabel: string;
    previewAlt: string;
    accept?: string;
    disabled?: boolean;
    uploading?: boolean;
  }>(),
  {
    placeholder: "",
    accept: "image/png,image/jpeg,image/webp",
    disabled: false,
    uploading: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:uploading": [value: boolean];
  uploaded: [url: string];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const { uploadImage, isUploading, uploadError, clearError } = useCloudStorage();

const previewUrl = computed(() => {
  const normalized = props.modelValue.trim();
  return normalized.length > 0 ? normalized : null;
});

watch(
  isUploading,
  (value) => {
    emit("update:uploading", value);
  },
  { immediate: true },
);

const handlePickImage = () => {
  fileInputRef.value?.click();
};

const handleUrlInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:modelValue", target?.value ?? "");
  clearError();
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;
  if (!file) {
    return;
  }

  try {
    const url = await uploadImage(file, { purpose: props.purpose });
    emit("update:modelValue", url);
    emit("uploaded", url);
  } finally {
    if (input) {
      input.value = "";
    }
  }
};
</script>

<style lang="scss" scoped>
.image-url-input {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.image-url-input__file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.image-url-input__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
  align-items: center;
}

.image-url-input__text {
  min-width: 0;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-lowest);
  color: var(--sys-color-on-surface);
  padding: var(--sys-spacing-small);
  @include mx.pu-font(body-medium);

  &:focus {
    border-color: var(--sys-color-primary);
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 1px;
  }
}

.image-url-input__preview {
  width: min(100%, 240px);
  aspect-ratio: 4 / 3;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  object-fit: cover;
  background: var(--sys-color-surface-container-low);
}

.image-url-input__error {
  margin: 0;
  color: var(--sys-color-error);
  @include mx.pu-font(body-small);
}

@media (max-width: 560px) {
  .image-url-input__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
