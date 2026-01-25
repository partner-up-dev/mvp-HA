import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import { createHead } from "@unhead/vue/client";
import { router } from "./router";
import "uno.css";
import "./styles/index.scss";

const app = createApp(App);
const head = createHead();
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

app.use(head);
app.use(pinia);
app.use(VueQueryPlugin);
app.use(router);

app.mount("#app");
