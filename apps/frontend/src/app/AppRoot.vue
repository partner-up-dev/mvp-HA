<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useAuthSessionBootstrap } from "@/processes/auth/useAuthSessionBootstrap";
import { useRouteWeChatAutoLogin } from "@/processes/wechat/useRouteWeChatAutoLogin";
import { useRouteWeChatShare } from "@/processes/wechat/useRouteWeChatShare";

useAuthSessionBootstrap();
useRouteWeChatAutoLogin();
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
