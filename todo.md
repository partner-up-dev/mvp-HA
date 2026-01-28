# TODOs of PartnerUp MVP-HA

- [ ] 声明不推荐寻找旅游搭子、演唱会搭子等复杂的搭子
- [ ] 有想要的功能？联系主创
- [ ] 添加 Logo
- [x] 支持配置 LLM Serveice Provider
  - `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_DEFAULT_MODEL`
- [x] 提示用户还有什么没输入完，不能提交，而不是直接灰色掉按钮
- [x] 移除流式加载的部分，AI响应很快
- [ ] 强调无登录、无隐私收集
- [x] 自动随机PIN
- [ ] 不要显示字数限制，而是在字数超出限制时说，你的需求可能太复杂，我们不适合
- [x] Title of PR Page
- [ ] Opengraph （似乎不太可能）
- [x] 加入按钮呢？退出按钮呢？
- [ ] 分享功能：

  ```ascii-art
  <  share as link  >
  | share           |
  | preview         |
  | here            |
  ```

  - [ ] 分享到小红书
  - [ ] 分享到微信：不是 copy text link，而是一个卡片

- [x] 搭子请求页可以返回首页
- [ ] 所有页面底部都可以联系主创、查看使用手册（使用手册是首页的一部分）
- [x] 为移动端优化交互
- [x] 搭子请求页标题（包括 tab 的）
- [x] 根据 CREATOR_OF 显示创建的搭子请求列表在首页
- [ ] 添加 EXPIRED 状态并根据时间窗口的限制自动过期（这就要求绝对时间）
- [x] PR.id 用 bigint serial 而不是 uuid
- [ ] 没有想找搭子的人，点进来，也不要有太高的流失率
  - 比如说AI联想推荐、典型案例、避免误会（认为只有旅游才需要找所谓的搭子）
  - 讲清楚你的定位，避免过高的预期或者误会
  - 只有用户对你的产品有了比较清楚的认知，他们后面才可能会想起来你；而且这时候一定要让他们方便地找到你，比如做好SEO，比如推荐加入收藏夹（别人可能不记得你的名字，要选对标题）
- [ ] CI/CD
- [x] 数据库可以修改 prompt
- [ ] 文档系统

````md
更新文档：

```
product-docs/
  overview.md           # 产品是什么、给谁用
  features/
    share-to-xhs.md     # 功能：分享到小红书
    find-partner.md     # 功能：找搭子
    ...
  glossary.md           # 术语表（搭子请求、...）
```

每个功能文档只描述：

- 用户故事
- 流程
- 验收标准
- 涉及哪些端（H5?后端?小程序?）

代码库层文档（每个库各自维护）

```
repo-h5/
  AGENTS.md            # 这个库的技术上下文
  src/
    ...

repo-backend/
  AGENTS.md
  src/
    ...
```

CONTEXT.md 包含：

- 技术栈
- 目录结构
- 编码约定
- 当前状态

工作流变成：

```
产品层：写/更新 PRD
    ↓
确定这个功能涉及哪些代码库
    ↓
对每个代码库：
    PRD + 该库的 CONTEXT.md → 跟 Agent 对话 → 代码
```

核心要点：

- 渐进式分层（L0→L3）：PRD → 方案 → 结构 → 代码，每层确认后再进下一层
- 产品层 vs 代码库层分离：PRD 是全局的，AGENTS.md 是每个代码库各自的
- MVP 阶段只维护两样：功能 PRD + 各库的 AGENTS.md，过程文档用完即弃
- 代码是 source of truth：文档是沟通工具，不是目的

---

但现在不是 MVP 阶段了，所以：

```
docs/
  features/           # 按功能组织，描述「做什么」
    share-to-xhs/
      PRD.md
      HLD.md
      LLD.md
      
  modules/            # 按模块组织，描述「这个模块是什么」
    llm-service.md
    poster-generator.md
    app-scheme.md
    
  decisions/          # ADR，记录技术决策
    001-llm-backend-vs-frontend.md
    002-poster-generation-approach.md
```

功能文档引用模块文档，而不是重复描述：

只需要维护：

项目级约束文档（技术栈、目录规范、编码规范）— 很少变
ADR（关键决策记录）— 只追加
功能 PRD（产品层面的需求）— 上线后归档

而 HLD、LLD 这些过程性文档，用完即弃，下次需要时重新生成。
````
