<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <SupportResourceExecutionRail
        v-model="searchText"
        :pending-count="executionStats.pendingCount"
        :audit-count="executionStats.auditCount"
        :filtered-pending-count="executionStats.filteredPendingCount"
        :filtered-audit-count="executionStats.filteredAuditCount"
      />
    </template>

    <template #main>
      <SupportResourceExecutionSection
        :is-admin="isAdmin"
        :search-text="searchText"
        @stats-change="handleStatsChange"
      />
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import SupportResourceExecutionRail from "@/domains/admin/ui/support-resource/components/SupportResourceExecutionRail.vue";
import SupportResourceExecutionSection from "@/domains/admin/ui/support-resource/sections/SupportResourceExecutionSection.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";

type ExecutionStats = {
  pendingCount: number;
  auditCount: number;
  filteredPendingCount: number;
  filteredAuditCount: number;
};

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const searchText = ref("");
const executionStats = reactive<ExecutionStats>({
  pendingCount: 0,
  auditCount: 0,
  filteredPendingCount: 0,
  filteredAuditCount: 0,
});

const handleStatsChange = (stats: ExecutionStats) => {
  executionStats.pendingCount = stats.pendingCount;
  executionStats.auditCount = stats.auditCount;
  executionStats.filteredPendingCount = stats.filteredPendingCount;
  executionStats.filteredAuditCount = stats.filteredAuditCount;
};
</script>
