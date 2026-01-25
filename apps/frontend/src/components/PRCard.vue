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

    <div class="field" v-if="parsed.peopleCount">
      <span class="label">人数</span>
      <span class="value">{{ parsed.peopleCount }}人</span>
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
  scenario: string;
  time: string | null;
  location: string | null;
  peopleCount: number | null;
  budget: string | null;
  preferences: string[];
  notes: string | null;
}

defineProps<{
  parsed: ParsedPartnerRequest;
  rawText: string;
}>();
</script>

<style lang="scss" scoped>
.pr-card {
  background: var(--sys-color-surface-container-low);
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
  }
}
</style>
