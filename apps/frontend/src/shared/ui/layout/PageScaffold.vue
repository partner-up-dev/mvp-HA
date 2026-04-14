<template>
  <div class="page-scaffold">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.page-scaffold {
  @include mx.pu-page-shell;
}
</style>
