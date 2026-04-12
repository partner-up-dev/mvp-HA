/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WECHAT_ABILITY_MOCKING_ENABLED?: "true" | "false";
  readonly VITE_WECHAT_MINIPROGRAM_WEBVIEW_MOCKING_ENABLED?: "true" | "false";
  readonly VITE_FRONTEND_COMMIT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
