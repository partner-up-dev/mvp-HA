# TODOs of PartnerUp MVP-HA

## Deployment

- [ ] CICD 还有可以优化的（不需要检查层依赖、层清理、包清理）
- [ ] CICD 数据库迁移
- [ ] 后端、数据库都是按需启动的，冷启动会比较慢，Loading需要有更多变化（比如“再等一下下”）
- [ ] 【HIGH】后端冷启动及其缓慢，RuntimeInitialization消耗6s；函数 Invocation 消耗 6 秒（仅仅是 js-sdk signature req哦）
- [ ] 在移动端的加载速度还有待优化
- [x] 多环境支持：后端通过httpTrigger+函数别名 (`https://test.api-app.partner-up.cn`)；前端创建另一个Page (`https://test.app.partner-up.cn`)

## Home

- [ ] 重构首页：没有想找搭子的人，点进来，也不要有太高的流失率
  - [ ] 强调无登录、无隐私收集
  - [ ] 讲清楚你的定位，避免过高的预期或者误会
  - [x] 只有用户对你的产品有了比较清楚的认知，他们后面才可能会想起来你；而且这时候一定要让他们方便地找到你，比如做好SEO，比如推荐加入收藏夹（别人可能不记得你的名字，要选对标题）
  - [x] 重点太多，重点不清晰，用户感到害怕。再移动设备上这一点被进一步地放大；缺少留白
    [x] 首页应该更多转向 Landing Page，避免嵌入复杂的表单、文本，使用更大、艺术的字。
- [x] 各页面都配置微信分享
- [x] Event Highlights Section
- [x] 收藏弹窗的弹出位置有问题
- [x] hero section NL create PR

## PR

- [x] 分享到微信的“换一个”没有发现风格区别
- [x] 分享到微信的 description 和 title 怎么能一样呢
- [x] 因为 poster, thumbnail 会被自动清理，所以前端一旦发现 404，应该重新生成，而不是留着 broken image
- [x] PR partners current默认为1啊，创建者自己也算啊
- [ ] PIN 为用户 PIN，不再是 PR PIN
  - [ ] 创建PR时自动创建用户并生成 PIN （即密码）
  - [ ] PIN 和 userid 缓存在 localStorage 中
  - [ ] 新创建的 PR Page 中单开一个卡片进一步讲解 PIN 的作用以及如何修改
- [ ] Anchor PR / Community PR 分开不同的页面和不同的表（但仍然会有可复用的组件）
  - [ ] raw_text 对于 Anchor PR 来说是可选的
  - [ ] 还有更多的外键约束
- [ ] PR Page "你的槽位" 是什么鬼？而且我创建的怎么我还没加入呢？
- [x] 添加一个 hybird 页面合并 form create 和 NL create
- [ ] partner section
- [ ] PR state UX 优化
  - [ ] diagram （特别EXPIRE 路线）
  - [ ] incoming state
- [ ] 我的搭子请求列表

### Create/Edit

- [ ] NL Input Placeholder 可以直接创建，不用“如”，可以让用户快速尝试
- [ ] NL input cache
- [ ] datetime picker 的编辑体验有待优化

### Share

- [ ] 跳转小红书App（最好能跳到笔记草稿页） <https://chatgpt.com/c/698b28a9-9990-83a8-bf9f-a00bd6158096>

## Event

- [x] Event Plaza Page, Event Page (batch as tab)

### POIs

- [x] id, gallery; id is natural language
- [x] show in event card, PR page
- [ ] nickname (shorter friendly name)

## Others

- [ ] Static Incremental Regeneration and Open graph
- [x] 接入客服 <https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5>, <https://work.weixin.qq.com/nl/act/p/4030a5b69149404d> ，删除联系主创
- [x] 当WebHistory为空时，显示 home 而不是 back
