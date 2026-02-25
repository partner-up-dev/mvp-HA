import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    wechatSharePolicy?: "route" | "skip";
  }
}

export {};
