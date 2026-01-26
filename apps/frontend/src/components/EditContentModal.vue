<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>编辑搭子需求</h3>

      <form @submit.prevent="handleSubmit">
        <div class="form-field">
          <label>标题 <span class="required">*</span></label>
          <input
            v-model="formData.title"
            type="text"
            placeholder="例如：周末一起爬香山"
          />
        </div>

        <div class="form-field">
          <label>活动类型 <span class="required">*</span></label>
          <input
            v-model="formData.scenario"
            type="text"
            placeholder="例如：爬山、看电影、打球等"
          />
        </div>

        <div class="form-field">
          <label>时间</label>
          <input
            v-model="formData.time"
            type="text"
            placeholder="例如：周末、明天下午等"
          />
        </div>

        <div class="form-field">
          <label>地点</label>
          <input
            v-model="formData.location"
            type="text"
            placeholder="例如：香山公园、中关村等"
          />
        </div>

        <div class="form-field">
          <label>最少人数</label>
          <input
            v-model.number="formData.minParticipants"
            type="number"
            placeholder="至少需要几个人"
          />
        </div>

        <div class="form-field">
          <label>最多人数</label>
          <input
            v-model.number="formData.maxParticipants"
            type="number"
            placeholder="最多需要几个人"
          />
        </div>

        <div class="form-field">
          <label>预算</label>
          <input
            v-model="formData.budget"
            type="text"
            placeholder="例如：AA、我请客等"
          />
        </div>

        <div class="form-field">
          <label>偏好要求</label>
          <div class="tags-input">
            <div class="tags">
              <span
                v-for="(pref, index) in formData.preferences"
                :key="index"
                class="tag"
              >
                {{ pref }}
                <button
                  type="button"
                  class="remove-tag"
                  @click="removePreference(index)"
                >
                  ×
                </button>
              </span>
            </div>
            <input
              v-model="newPreference"
              type="text"
              placeholder="输入后按回车添加"
              @keydown.enter.prevent="addPreference"
            />
          </div>
        </div>

        <div class="form-field">
          <label>备注</label>
          <textarea v-model="formData.notes" rows="3" placeholder="其他说明" />
        </div>

        <div class="form-field pin-field">
          <label>PIN码确认 <span class="required">*</span></label>
          <input
            v-model="pin"
            type="password"
            inputmode="numeric"
            maxlength="4"
            placeholder="****"
          />
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="$emit('close')">
            取消
          </button>
          <SubmitButton
            type="submit"
            :loading="updateMutation.isPending.value"
            :disabled="!isFormValid"
          >
            确认修改
          </SubmitButton>
        </div>

        <ErrorToast
          v-if="updateMutation.isError.value"
          :message="updateMutation.error.value?.message || '修改失败'"
          @close="updateMutation.reset()"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { ParsedPartnerRequest, PRId } from "@partner-up-dev/backend";
import { useUpdatePRContent } from "@/queries/useUpdatePRContent";
import SubmitButton from "@/components/SubmitButton.vue";
import ErrorToast from "@/components/ErrorToast.vue";

interface Props {
  open: boolean;
  initialParsed: ParsedPartnerRequest;
  prId: PRId;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const updateMutation = useUpdatePRContent();

// Form data
const formData = ref<ParsedPartnerRequest>({
  title: props.initialParsed.title || "",
  scenario: props.initialParsed.scenario,
  time: props.initialParsed.time,
  location: props.initialParsed.location,
  minParticipants: props.initialParsed.minParticipants,
  maxParticipants: props.initialParsed.maxParticipants,
  budget: props.initialParsed.budget,
  preferences: [...props.initialParsed.preferences],
  notes: props.initialParsed.notes,
});

const pin = ref("");
const newPreference = ref("");

// Reset form when modal opens with new data
watch(
  () => props.initialParsed,
  (newVal) => {
    formData.value = {
      title: newVal.title || "",
      scenario: newVal.scenario,
      time: newVal.time,
      location: newVal.location,
      minParticipants: newVal.minParticipants,
      maxParticipants: newVal.maxParticipants,
      budget: newVal.budget,
      preferences: [...newVal.preferences],
      notes: newVal.notes,
    };
  },
  { deep: true },
);

const isFormValid = computed(() => {
  return (
    (formData.value.title?.trim().length ?? 0) > 0 &&
    formData.value.scenario.trim().length > 0 &&
    pin.value.length === 4
  );
});

const addPreference = () => {
  const pref = newPreference.value.trim();
  if (pref && !formData.value.preferences.includes(pref)) {
    formData.value.preferences.push(pref);
    newPreference.value = "";
  }
};

const removePreference = (index: number) => {
  formData.value.preferences.splice(index, 1);
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  try {
    await updateMutation.mutateAsync({
      id: props.prId,
      parsed: formData.value,
      pin: pin.value,
    });

    emit("success");
    emit("close");
    pin.value = "";
  } catch (error) {
    // Error is handled by ErrorToast
  }
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-med);
  z-index: 1000;
}

.modal {
  background: var(--sys-color-surface);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-lg);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;

  h3 {
    @include mx.pu-font(title-large);
    margin-bottom: var(--sys-spacing-med);
  }
}

.form-field {
  margin-bottom: var(--sys-spacing-med);

  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);

    .required {
      color: var(--sys-color-error);
    }
  }

  input,
  textarea {
    @include mx.pu-font(body-large);
    width: 100%;
    padding: var(--sys-spacing-sm);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-med);
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface);

    &::placeholder {
      color: var(--sys-color-on-surface-variant);
      opacity: 0.6;
    }

    &:focus {
      outline: 2px solid var(--sys-color-primary);
      outline-offset: -1px;
    }
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }
}

.pin-field input {
  @include mx.pu-font(title-medium);
  text-align: center;
  letter-spacing: 0.5em;
}

.tags-input {
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-med);
  padding: var(--sys-spacing-xs);
  background: var(--sys-color-surface-container);

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sys-spacing-xs);
    margin-bottom: var(--sys-spacing-xs);
  }

  .tag {
    @include mx.pu-font(label-small);
    display: inline-flex;
    align-items: center;
    gap: var(--sys-spacing-xs);
    padding: 2px var(--sys-spacing-xs);
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    border-radius: var(--sys-radius-sm);

    .remove-tag {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        opacity: 0.7;
      }
    }
  }

  input {
    border: none;
    background: none;
    padding: var(--sys-spacing-xs);
    width: 100%;

    &:focus {
      outline: none;
    }
  }
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-med);
  background: transparent;
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container);
  }
}
</style>
