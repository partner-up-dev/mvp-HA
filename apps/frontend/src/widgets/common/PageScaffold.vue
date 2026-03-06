<template>
  <div class="page-scaffold">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.page-scaffold {
  max-width: var(--pu-page-max-width, 480px);
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}
</style>
