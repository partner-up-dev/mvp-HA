<template>
  <section v-if="!shouldHide" class="created-section">
    <div class="created-header">
      <h2 class="created-title">我的搭子请求</h2>
      <span v-if="userPRStore.createdPRs.length" class="created-count">
        {{ userPRStore.createdPRs.length }}
      </span>
    </div>

    <p v-if="!userPRStore.createdPRs.length && props.emptyMode === 'text'" class="created-empty">
      还没有创建过搭子请求
    </p>

    <LoadingState
      v-else-if="creatorPRsQuery.isLoading.value"
      message="正在加载你创建的请求..."
    />

    <p v-else-if="creatorPRsQuery.error.value" class="created-error">
      {{
        creatorPRsQuery.error.value instanceof Error
          ? creatorPRsQuery.error.value.message
          : "加载失败"
      }}
    </p>

    <ul v-else class="created-list">
      <li
        v-for="pr in creatorPRsQuery.data.value?.items || []"
        :key="pr.id"
        class="created-item-wrapper"
      >
        <button class="created-item" type="button" @click="goToPR(pr.id)">
          <div class="created-item-top">
            <div class="created-item-text">
              <div class="created-item-name">
                {{ pr.title || pr.type }}
              </div>
              <time class="created-item-time">
                {{ formatDate(pr.createdAt) }}
              </time>
            </div>
            <StatusBadge :status="pr.status" />
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { computed } from "vue";
import LoadingState from "@/components/LoadingState.vue";
import StatusBadge from "@/components/StatusBadge.vue";
import { useCreatorPRs } from "@/queries/useCreatorPRs";
import { useUserPRStore } from "@/stores/userPRStore";
import type { PRId } from "@partner-up-dev/backend";

type EmptyMode = "hide" | "text";

const props = withDefaults(
  defineProps<{
    emptyMode?: EmptyMode;
  }>(),
  {
    emptyMode: "text",
  },
);

const router = useRouter();
const userPRStore = useUserPRStore();
const creatorPRsQuery = useCreatorPRs();

const shouldHide = computed(
  () => userPRStore.createdPRs.length === 0 && props.emptyMode === "hide",
);

const goToPR = (id: PRId) => {
  router.push(`/pr/${id}`);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<style lang="scss" scoped>
.created-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.created-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.created-title {
  @include mx.pu-font(title-large);
  color: var(--sys-color-on-surface);
  margin: 0;
}

.created-count {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.created-empty {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.created-error {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-error);
  margin: 0;
}

.created-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.created-item-wrapper {
  margin: 0;
}

.created-item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-xs);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-med);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container);
  }
}

.created-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.created-item-text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.created-item-name {
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.created-item-time {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}
</style>
