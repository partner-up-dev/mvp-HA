<template>
  <PageScaffold class="desktop-page-scaffold">
    <div class="desktop-page-scaffold__layout">
      <header v-if="$slots.header" class="desktop-page-scaffold__header">
        <slot name="header" />
      </header>

      <div class="desktop-page-scaffold__shell">
        <aside v-if="$slots.aside" class="desktop-page-scaffold__aside">
          <slot name="aside" />
        </aside>

        <main class="desktop-page-scaffold__main">
          <slot />
        </main>
      </div>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
</script>

<style lang="scss" scoped>
.desktop-page-scaffold {
  --pu-page-max-width: 1320px;
}

.desktop-page-scaffold__layout {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xl, 2rem);
}

.desktop-page-scaffold__header {
  min-width: 0;
}

.desktop-page-scaffold__shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: var(--sys-spacing-xl, 2rem);
  align-items: start;
}

.desktop-page-scaffold__aside,
.desktop-page-scaffold__main {
  min-width: 0;
}

@media (min-width: 901px) {
  .desktop-page-scaffold__aside {
    position: sticky;
    top: calc(var(--sys-spacing-med) + var(--pu-safe-top));
  }
}

@media (max-width: 900px) {
  .desktop-page-scaffold__shell {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
