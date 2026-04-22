<template>
  <PageScaffoldCentered class="pr-detail-forward-page">
    <LoadingIndicator
      v-if="isLoading"
      :message="t('common.loading')"
    />
    <ErrorToast
      v-else-if="errorMessage"
      :message="errorMessage"
      persistent
    />
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { useI18n } from "vue-i18n";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { resolvePRCompatibilityDetailPath } from "@/domains/pr/routing/routes";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const id = usePRRouteId();
const { data, isLoading, error } = usePRDetail(id);

const errorMessage = computed(() => {
  if (!(error.value instanceof Error)) {
    return null;
  }
  return error.value.message;
});

watch(
  () => data.value,
  async (detail) => {
    if (!detail || id.value === null) {
      return;
    }

    await router.replace({
      path: resolvePRCompatibilityDetailPath({
        id: id.value,
        prKind: detail.prKind,
      }),
      query: route.query,
      hash: route.hash,
    });
  },
  { immediate: true },
);
</script>
