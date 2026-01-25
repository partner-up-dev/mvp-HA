<template>
  <!-- Modal Overlay -->
  <Transition name="modal">
    <div v-if="open" class="modal-overlay" @click.self="closeIfComplete">
      <div class="modal-content">
        <div class="modal-header">
          <h3>解析过程 (Parsing Process)</h3>
          <button
            v-if="!isStreaming"
            @click="emit('close')"
            class="close-btn"
            aria-label="Close"
          >
            <span class="i-mdi-close"></span>
          </button>
        </div>

        <div class="timeline">
          <!-- Step 1: Raw Input -->
          <div class="step completed">
            <div class="step-icon"><span class="i-mdi-check"></span></div>
            <div class="step-content">
              <h4>原始输入 (Raw Input)</h4>
              <pre>{{ rawText }}</pre>
            </div>
          </div>

          <!-- Step 2: LLM Processing -->
          <div class="step" :class="{ active: isStreaming, completed: !isStreaming }">
            <div class="step-icon">
              <div v-if="isStreaming" class="spinner"></div>
              <span v-else class="i-mdi-check"></span>
            </div>
            <div class="step-content">
              <h4>LLM 解析中 (LLM Parsing)</h4>
              <p v-if="isStreaming">正在处理...</p>
              <p v-else>解析完成</p>
            </div>
          </div>

          <!-- Step 3: Structured Output (Streaming) -->
          <div class="step" :class="{ active: partialResult, completed: !isStreaming }">
            <div class="step-icon">
              <span v-if="isStreaming" class="i-mdi-hourglass-bottom"></span>
              <span v-else class="i-mdi-check"></span>
            </div>
            <div class="step-content">
              <h4>结构化输出 (Structured Output)</h4>
              <div v-if="partialResult" class="parsed-fields">
                <div v-for="(value, key) in partialResult" :key="key" class="field">
                  <span class="field-name">{{ key }}:</span>
                  <span class="field-value" :class="{ partial: isStreaming }">
                    {{ formatValue(value) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <p v-if="isStreaming" class="status-text">请稍候，正在解析中...</p>
          <button v-else @click="emit('complete')" class="continue-btn">
            继续 →
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ParsedPartnerRequest } from '@partner-up-dev/backend';
import { client } from '../lib/rpc';

const props = defineProps<{
  open: boolean;
  rawText: string;
}>();

const emit = defineEmits<{
  close: [];
  complete: [];
}>();

const isStreaming = ref(false);
const partialResult = ref<Partial<ParsedPartnerRequest> | null>(null);

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    partialResult.value = null;
    return;
  }

  isStreaming.value = true;
  partialResult.value = null;

  try {
    // Use client API for proper routing (supports mock mode)
    const response = await client.api.pr['parse-stream'].$post({
      json: { rawText: props.rawText },
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          partialResult.value = { ...(partialResult.value || {}), ...data };
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
  } finally {
    isStreaming.value = false;
  }
});

const closeIfComplete = () => {
  if (!isStreaming.value) {
    emit('close');
  }
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '...';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--sys-spacing-lg);
}

.modal-content {
  background: var(--sys-color-surface);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-lg);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sys-spacing-lg);

  h3 {
    margin: 0;
  }
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--sys-color-on-surface);
  padding: var(--sys-spacing-xs);
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    @include mx.pu-icon(lg);
  }

  &:hover {
    opacity: 0.7;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  margin-bottom: var(--sys-spacing-lg);
}

.step {
  display: flex;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-variant);
  transition: all 0.3s;

  &.active {
    background: var(--sys-color-primary-container);
    border: 2px solid var(--sys-color-primary);
  }

  &.completed {
    opacity: 0.9;
  }
}

.step-icon {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  font-weight: bold;

  span {
    @include mx.pu-icon(md);
  }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--sys-color-on-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-content {
  flex: 1;

  h4 {
    margin: 0 0 var(--sys-spacing-xs);
  }

  pre {
    background: var(--sys-color-surface);
    padding: var(--sys-spacing-sm);
    border-radius: var(--sys-radius-xs);
    overflow-x: auto;
  }
}

.parsed-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.field {
  display: flex;
  gap: var(--sys-spacing-xs);
}

.field-name {
  font-weight: 600;
  color: var(--sys-color-primary);
}

.field-value {
  &.partial {
    opacity: 0.7;
    font-style: italic;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--sys-spacing-med);
  border-top: 1px solid var(--sys-color-outline);
}

.status-text {
  color: var(--sys-color-on-surface-variant);
  font-style: italic;
}

.continue-btn {
  padding: var(--sys-spacing-sm) var(--sys-spacing-lg);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border: none;
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;

  .modal-content {
    transition: transform 0.3s;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-content {
    transform: scale(0.9);
  }
}
</style>
