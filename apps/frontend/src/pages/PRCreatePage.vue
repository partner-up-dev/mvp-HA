<template>
  <div class="create-page">
    <header class="page-header">
      <button
        class="home-btn"
        @click="goHome"
        :aria-label="t('common.backToHome')"
      >
        <div class="i-mdi-arrow-left font-title-large"></div>
      </button>
      <h1>{{ t("createPage.title") }}</h1>
    </header>

    <main class="page-main">
      <PartnerRequestForm
        ref="formRef"
        :initial-fields="initialFields"
        @submit="handleSubmit"
      />
    </main>

    <footer class="page-footer">
      <button
        class="save-btn"
        type="button"
        :disabled="createMutation.isPending.value"
        @click="submitAs('DRAFT')"
      >
        {{
          createMutation.isPending.value && pendingStatus === "DRAFT"
            ? t("createPage.savePending")
            : t("common.save")
        }}
      </button>
      <button
        class="create-btn"
        type="button"
        :disabled="createMutation.isPending.value"
        @click="submitAs('OPEN')"
      >
        {{
          createMutation.isPending.value && pendingStatus === "OPEN"
            ? t("createPage.createPending")
            : t("common.create")
        }}
      </button>
    </footer>

    <ErrorToast
      v-if="createMutation.isError.value"
      :message="
        createMutation.error.value?.message || t('createPage.createFailed')
      "
      @close="createMutation.reset()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import { useI18n } from "vue-i18n";
import type {
  CreatePRStructuredStatus,
  PartnerRequestFields,
} from "@partner-up-dev/backend";
import PartnerRequestForm from "@/components/PartnerRequestForm.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import { useUserPRStore } from "@/stores/userPRStore";
import { useCreatePRFromStructured } from "@/queries/useCreatePR";
import type { PartnerRequestFormInput } from "@/lib/validation";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const userPRStore = useUserPRStore();
const createMutation = useCreatePRFromStructured();

const resolveTopic = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildInitialFields = (topic: string | null): PartnerRequestFields => ({
  title: undefined,
  type: topic ?? "",
  time: [null, null],
  location: null,
  partners: [null, 0, null],
  budget: null,
  preferences: [],
  notes: null,
});

const initialFields = ref<PartnerRequestFields>(
  buildInitialFields(resolveTopic(route.query.topic)),
);

const formRef = ref<InstanceType<typeof PartnerRequestForm> | null>(null);
const pendingStatus = ref<CreatePRStructuredStatus>("OPEN");

const submitAs = (status: CreatePRStructuredStatus) => {
  pendingStatus.value = status;
  formRef.value?.submitForm();
};

const handleSubmit = async ({ fields, pin }: PartnerRequestFormInput) => {
  const result = await createMutation.mutateAsync({
    fields,
    pin,
    status: pendingStatus.value,
  });

  userPRStore.addCreatedPR(result.id);
  await router.push(`/pr/${result.id}`);
};

const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
.create-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);

  h1 {
    @include mx.pu-font(headline-medium);
    color: var(--sys-color-on-surface);
    margin: 0;
  }
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  border-radius: 999px;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--sys-color-surface-container);
  }
}

.page-main {
  flex: 1;
}

.page-footer {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.save-btn,
.create-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  min-height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
}

.save-btn {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.create-btn {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}
</style>
