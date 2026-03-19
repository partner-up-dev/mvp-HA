<template>
  <div class="page-scaffold">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.page-scaffold {
  @include mx.pu-page-shell;
  max-width: var(--pu-page-max-width, var(--dcs-layout-page-max-width));
}
</style>
