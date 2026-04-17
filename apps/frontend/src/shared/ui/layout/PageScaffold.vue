<template>
  <div class="page-scaffold">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.page-scaffold {
  max-width: var(--pu-page-max-width, var(--dcs-layout-page-max-width));
  min-height: var(--pu-vh);
  margin: 0 auto;
  padding-top: var(
    --pu-page-padding-top,
    calc(var(--sys-spacing-med) + var(--pu-safe-top))
  );
  padding-right: var(
    --pu-page-padding-right,
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
  );
  padding-bottom: var(
    --pu-page-padding-bottom,
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
  );
  padding-left: var(
    --pu-page-padding-left,
    calc(var(--sys-spacing-med) + var(--pu-safe-left))
  );
}
</style>
