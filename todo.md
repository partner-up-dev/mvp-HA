# TODOs of PartnerUp MVP-HA

## Deployment

- [ ] CICD 还有可以优化的（不需要检查层依赖、层清理、包清理）
- [x] 数据库迁移（开发/部署）工作流改进
- [ ] 【HIGH】后端冷启动及其缓慢，RuntimeInitialization消耗6s；函数 Invocation 消耗 6 秒（仅仅是 js-sdk signature req哦）
- [ ] 在移动端的加载速度还有待优化
- [x] 多环境支持：后端通过httpTrigger+函数别名 (`https://test.api-app.partner-up.cn`)；前端创建另一个Page (`https://test.app.partner-up.cn`)

## Quality Of Life

- [ ] `@media` 直接从 token 级别作用
- [ ] 基于 `calc`, `color` 等变换 token 的方式是禁止的
- [ ] 添加 ListScaffold，支持关键词搜索、筛选器，配置一个ItemFetcher和ItemRenderer即可
- [ ] 间距是属于父组件控制的，或者说容器组件
- [ ] 添加 dropdown, input, button, card 这样的原子组件

## Marketing

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
- [ ] Static Incremental Regeneration and Open graph

## User

- [ ] 添加“我的”页面：可以绑定微信；开关服务通知；修改头像和昵称

## PR

- [x] PR partners current默认为1啊，创建者自己也算啊
- [x] PIN 为用户 PIN，不再是 PR PIN
  - [x] 创建PR时自动创建用户并生成 PIN （即密码）
  - [x] PIN 和 userid 缓存在 localStorage 中
  - [x] 新创建的 PR Page 中单开一个卡片进一步讲解 PIN 的作用以及如何修改
- [x] Anchor PR / Community PR 分开不同的页面和不同的表（但仍然会有可复用的组件）
  - [x] raw_text 对于 Anchor PR 来说是可选的
  - [x] 还有更多的外键约束
- [x] 我的搭子请求列表
- [ ] min-partners 必须大于1 （记得告诉 NL parsing LLM）

### Detail Page

- [ ] 重构 PR Detail Page
  - [ ] 重新设计/添加 partner section
    - [ ] 加入/退出按钮
    - [ ] 其它搭子
    - [ ] min/max partners
    - [ ] "你的槽位" 是什么鬼？而且我创建的怎么我还没加入呢？
  - [ ] PR status UX 优化
    - [ ] diagram （特别EXPIRE 路线）
    - [ ] incoming state
- [ ] 在活动页面中可以允许用户主动创建该batch下pr；在活动页面引导用户创建 community pr（这两个应该是一个入口？）
- [ ] PageHeader Sitcky

### Create/Edit

- [x] 添加一个 hybird 页面合并 form create 和 NL create
- [x] POST /api/pr body becomes { ...fields, ~status~ }.
- [ ] NL Input Placeholder 可以直接创建，不用“如”，可以让用户快速尝试
- [ ] NL input cache
- [ ] NL Input 微信内支持语音输入
- [ ] datetime picker 的编辑体验有待优化

### Community PR

- [ ] 加入时自动创建用户（加入成果也显示 PIN Help Section，告诉用户未来退出时会需要）

### Anchor PR

- [ ] 加入 Anchor PR 需要微信登录，如果不在微信内呢？

### Share

- [x] 因为 poster, thumbnail 会被自动清理，所以前端一旦发现 404，应该重新生成，而不是留着 broken image
- [x] 分享到微信的“换一个”没有发现风格区别
- [x] 分享到微信的 description 和 title 怎么能一样呢
- [ ] PRShareSection 布局重构
- [ ] 跳转小红书App（最好能跳到笔记草稿页） <https://chatgpt.com/c/698b28a9-9990-83a8-bf9f-a00bd6158096>

## Event

- [x] Event Plaza Page, Event Page (batch as tab)
- [x] 重构补贴和资源
  - [x] 预订和购买是两件事情
  - [x] 在用户不需要支付任何费用的情况下，平台会提供金钱以外的资助，如羽毛球活动提供能量饮料、羽毛球；学习冲刺场景提供桌面时钟
  - [x] 合并 Model A 和 Model C：平台可以代预订，但是费用由用户自行支付，后续平台报销（补贴比例+补贴上限）；对于预订需要预付的情况，需要用户先支付给平台（直接抵消补贴）；所以其实补贴其实只分为平台预付和平台后付（而不是分为部分补贴和全额补贴）
  - [x] 资源和预订需要一个表
  - [x] 重新设计经济页面（至少得重命名为预订和补贴）
- [ ] 用户可以请求组织更多类型的活动、批次；其它人也可以看到，然后投票
- [ ] batch tabBar 排序为按开始时间升序

### Booking & Support

- [ ] 资源配以图片
- [ ] 报销不需要

## Base/Common

### POIs

- [x] id, gallery; id is natural language
- [x] show in event card, PR page
- [ ] nickname (shorter friendly name)

### Support

- [x] 接入客服 <https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5>, <https://work.weixin.qq.com/nl/act/p/4030a5b69149404d> ，删除联系主创
- [x] 客服分流：报销找企业微信员工；其它找企业微信客服
- [ ] 联系作者总是显示未配置（本地也是这样欸...先配置默认值缓缓吧总之）

## Others

- [x] 当WebHistory为空时，显示 home 而不是 back
