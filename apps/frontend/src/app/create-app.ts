import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createHead } from "@unhead/vue/client";
import AppRoot from "@/app/AppRoot.vue";
import { router } from "@/app/router";
import { i18n } from "@/locales/i18n";

export const createPartnerUpApp = () => {
  if (
    typeof window !== "undefined" &&
    "scrollRestoration" in window.history
  ) {
    window.history.scrollRestoration = "manual";
  }

  const app = createApp(AppRoot);
  const head = createHead();
  const pinia = createPinia();

  pinia.use(piniaPluginPersistedstate);

  app.use(head);
  app.use(pinia);
  app.use(VueQueryPlugin);
  app.use(i18n);
  app.use(router);

  return app;
};
