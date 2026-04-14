<template>
  <PageScaffold class="full-screen-page-scaffold">
    <header
      v-if="$slots.header"
      class="full-screen-page-scaffold__header"
    >
      <slot name="header" />
    </header>

    <main class="full-screen-page-scaffold__content">
      <slot />
    </main>

    <footer
      v-if="$slots.footer"
      class="full-screen-page-scaffold__footer"
    >
      <slot name="footer" />
    </footer>
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
</script>

<style lang="scss" scoped>
.full-screen-page-scaffold {
  display: flex;
  flex-direction: column;
  height: var(--pu-vh);
  min-height: var(--pu-vh);
}

.full-screen-page-scaffold__header,
.full-screen-page-scaffold__footer {
  min-width: 0;
  flex: 0 0 auto;
}

.full-screen-page-scaffold__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
