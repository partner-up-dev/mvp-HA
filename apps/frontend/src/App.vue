<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useAutoWeChatLogin } from "@/composables/useAutoWeChatLogin";
import { useRouteWeChatShare } from "@/composables/useRouteWeChatShare";

useAutoWeChatLogin();
useRouteWeChatShare();
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  min-height: var(--pu-vh);
  -webkit-tap-highlight-color: transparent;
}
</style>
