<template>
  <div class="pr-card">
    <div class="field" v-if="parsed.scenario">
      <span class="label">场景</span>
      <span class="value">{{ parsed.scenario }}</span>
    </div>

    <div class="field" v-if="parsed.time">
      <span class="label">时间</span>
      <span class="value">{{ parsed.time }}</span>
    </div>

    <div class="field" v-if="parsed.location">
      <span class="label">地点</span>
      <span class="value">{{ parsed.location }}</span>
    </div>

    <div class="field" v-if="parsed.minParticipants || parsed.maxParticipants">
      <span class="label">人数</span>
      <span class="value">{{
        formatParticipants(
          parsed.minParticipants,
          parsed.maxParticipants,
          participants,
        )
      }}</span>
    </div>

    <div class="field" v-if="parsed.budget">
      <span class="label">预算</span>
      <span class="value">{{ parsed.budget }}</span>
    </div>

    <div class="field" v-if="parsed.preferences.length">
      <span class="label">偏好</span>
      <div class="tags">
        <span class="tag" v-for="pref in parsed.preferences" :key="pref">
          {{ pref }}
        </span>
      </div>
    </div>

    <div class="field" v-if="parsed.notes">
      <span class="label">备注</span>
      <span class="value">{{ parsed.notes }}</span>
    </div>

    <details class="raw-text">
      <summary>原始描述</summary>
      <p>{{ rawText }}</p>
    </details>
  </div>
</template>

<script setup lang="ts">
interface ParsedPartnerRequest {
  title?: string;
  scenario: string;
  time: string | null;
  location: string | null;
  minParticipants: number | null;
  maxParticipants: number | null;
  budget: string | null;
  preferences: string[];
  notes: string | null;
}

defineProps<{
  parsed: ParsedPartnerRequest;
  rawText: string;
  participants?: number;
}>();

const formatParticipants = (
  min: number | null,
  max: number | null,
  current?: number,
) => {
  const parts: string[] = [];

  // Show current/max if both are available
  if (current !== undefined && max) {
    parts.push(`${current}/${max}`);
  } else if (current !== undefined) {
    parts.push(`已有${current}人`);
  }

  // Add min requirement if exists
  if (min) {
    parts.push(`（至少 ${min} 人）`);
  }

  // Fallback formats if no current count
  if (parts.length === 0) {
    if (min && max) {
      if (min === max) {
        return `${min}人`;
      }
      return `${min}-${max}人`;
    }
    if (min) {
      return `至少${min}人`;
    }
    if (max) {
      return `最多${max}人`;
    }
  }

  return parts.join(" ");
};
</script>

<style lang="scss" scoped>
.pr-card {
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  .label {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  .value {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
}

.tag {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
  border-radius: var(--sys-radius-sm);
}

.raw-text {
  margin-top: var(--sys-spacing-sm);

  summary {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
    cursor: pointer;
  }

  p {
    @include mx.pu-font(body-large);
    margin-top: var(--sys-spacing-sm);
    color: var(--sys-color-on-surface-variant);
    font-style: italic;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}
</style>
