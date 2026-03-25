export {};

declare global {
  type WeChatJsApiName =
    | "updateAppMessageShareData"
    | "updateTimelineShareData"
    | "openOfficialAccountProfile";

  type WeChatOpenTagName = "wx-open-subscribe";

  type WeChatConfigPayload = {
    debug?: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: ReadonlyArray<WeChatJsApiName>;
    openTagList?: ReadonlyArray<WeChatOpenTagName>;
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

  type WeChatOpenOfficialAccountProfileResponse = {
    err_msg?: string;
    errMsg?: string;
  } & Record<string, unknown>;

  type WeChatOpenOfficialAccountProfilePayload = {
    username: string;
  };
  type WeChatJssdk = {
    config: (payload: WeChatConfigPayload) => void;
    ready: (cb: () => void) => void;
    error: (cb: (error: unknown) => void) => void;
    updateAppMessageShareData: (payload: WeChatShareToChatPayload) => void;
    updateTimelineShareData: (payload: WeChatShareToTimelinePayload) => void;
    invoke?: (
      methodName: string,
      data: Record<string, unknown>,
      callback: (response: Record<string, unknown>) => void,
    ) => void;
    openOfficialAccountProfile?: (
      payload: WeChatOpenOfficialAccountProfilePayload,
      callback?: (response: WeChatOpenOfficialAccountProfileResponse) => void,
    ) => void;
  };

  const wx: WeChatJssdk | undefined;
}
