export {};

declare global {
  type WeChatConfigPayload = {
    debug?: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: ReadonlyArray<
      "updateAppMessageShareData" | "updateTimelineShareData"
    >;
  };

  type WeChatShareToChatPayload = {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
    success?: () => void;
    fail?: (error: unknown) => void;
  };

  type WeChatShareToTimelinePayload = {
    title: string;
    link: string;
    imgUrl: string;
    success?: () => void;
    fail?: (error: unknown) => void;
  };

  type WeChatJssdk = {
    config: (payload: WeChatConfigPayload) => void;
    ready: (cb: () => void) => void;
    error: (cb: (error: unknown) => void) => void;
    updateAppMessageShareData: (payload: WeChatShareToChatPayload) => void;
    updateTimelineShareData: (payload: WeChatShareToTimelinePayload) => void;
  };

  const wx: WeChatJssdk | undefined;
}

