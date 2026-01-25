<template>
  <div class="home-page">
    <header class="header">
      <h1>搭一把</h1>
      <p>描述你的搭子需求，一键生成分享页面</p>
    </header>

    <main class="main">
      <PRInput v-model="rawText" :disabled="mutation.isPending.value" />

      <div class="pin-input">
        <label for="pin">设置4位数字PIN码（用于修改状态）</label>
        <input
          id="pin"
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="\d{4}"
          placeholder="****"
          :disabled="mutation.isPending.value"
        />
      </div>

      <SubmitButton
        :loading="mutation.isPending.value"
        :disabled="!isValid"
        @click="handleSubmit"
      >
        生成分享页面
      </SubmitButton>

      <LoadingState
        v-if="mutation.isPending.value"
        message="正在解析你的需求..."
      />

      <ErrorToast
        v-if="mutation.isError.value"
        :message="mutation.error.value?.message || '创建失败'"
        @close="mutation.reset()"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import PRInput from "@/components/PRInput.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import { useCreatePR } from "@/queries/useCreatePR";

const router = useRouter();
const rawText = ref("");
const pin = ref("");

const mutation = useCreatePR();

const isValid = computed(() => {
  return rawText.value.trim().length > 0 && /^\d{4}$/.test(pin.value);
});

const handleSubmit = async () => {
  if (!isValid.value) return;

  const result = await mutation.mutateAsync({
    rawText: rawText.value,
    pin: pin.value,
  });

  router.push(`/pr/${result.id}`);
};
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--sys-spacing-med);
  min-height: 100vh;
}

.header {
  text-align: center;
  padding: var(--sys-spacing-lg) 0;

  h1 {
    @include mx.pu-font(headline-large);
    color: var(--sys-color-primary);
    margin-bottom: var(--sys-spacing-sm);
  }

  p {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface-variant);
  }
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.pin-input {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  label {
    @include mx.pu-font(label-large);
    color: var(--sys-color-on-surface-variant);
  }

  input {
    @include mx.pu-font(title-medium);
    padding: var(--sys-spacing-sm) var(--sys-spacing-med);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-med);
    background: var(--sys-color-surface-container-lowest);
    text-align: center;
    letter-spacing: 0.5em;
    width: 120px;

    &:focus {
      outline: none;
      border-color: var(--sys-color-primary);
    }

    &:disabled {
      opacity: var(--sys-opacity-disabled);
    }
  }
}
</style>
