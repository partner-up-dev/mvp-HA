# 术语表

- H-A MVP：协作效率产品假设的最小验证版本，目标是验证协作是否会发生。
- 协作触发器：嵌入对话/行为中的触发方式，把自然语言冻结为 PartnerRequest。
- PartnerRequest（搭子请求）：一次性协作单元，可被加入并自然结束的协作状态。
- PartnerRequestPreset：行为模板，只提供默认参数、文案与 UI 表现。
- PartnerRequestStatus：PartnerRequest 状态流转（OPEN / ACTIVE / CLOSED / EXPIRED）。
- Time Window：PartnerRequest 的时间窗口（start_at / end_at）。
- expiresAt：PartnerRequest 到期自动结束时间（ISO 8601）。
- Capacity：PartnerRequest 的人数阈值（min / max）。
- 分享链接：指向 PartnerRequest 页面、可复制传播的链接。
- 小红书文案：用于发布到小红书的分享文本。
- 分享海报：用于社交平台传播的图片。
- 微信分享卡片：在微信内分享时生成的标题/摘要/缩略图卡片。
