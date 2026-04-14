<template>
  <PageScaffold class="footer-reveal-page-scaffold">
    <div class="footer-reveal-page-scaffold__viewport">
      <header
        v-if="$slots.header"
        class="footer-reveal-page-scaffold__header"
      >
        <slot name="header" />
      </header>

      <main class="footer-reveal-page-scaffold__content">
        <slot />
      </main>
    </div>

    <footer
      v-if="$slots.footer"
      class="footer-reveal-page-scaffold__footer"
    >
      <slot name="footer" />
    </footer>
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
</script>

<style lang="scss" scoped>
.footer-reveal-page-scaffold {
  display: flex;
  flex-direction: column;
}

.footer-reveal-page-scaffold__viewport {
  display: flex;
  flex-direction: column;
  min-height: var(--pu-vh);
  min-width: 0;
}

.footer-reveal-page-scaffold__header,
.footer-reveal-page-scaffold__footer {
  min-width: 0;
  flex: 0 0 auto;
}

.footer-reveal-page-scaffold__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
