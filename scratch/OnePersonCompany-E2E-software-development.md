# OnePersonCompany-E2E-software-development

软件公司的规模正在被重新定义。

过去，一个完整的软件产研链路需要产品经理、设计师、前端、后端、测试、运维、项目管理等角色接力。每个角色都承担一段专业工作，也产生一段上下文交接成本。对一人公司来说，真正稀缺的资源，是从商业判断到生产环境反馈之间的稳定通路，代码时间只是其中一段。

这里的 E2E 指一条完整链路：商业决策、模糊产品意图、产品设计、开发、测试、部署上线、运行反馈。人类仍然在链路里，但干预点变得更集中：商业方向、方案讨论、技术取舍、关键验收。大量探索、实现、文档同步、测试补齐、部署维护，可以由 AI agent 在结构化工程系统中推进。

PartnerUp MVP-HA 这个仓库提供了一个可观察样本。截至 2026-05-06，本地与 GitHub 可见历史里有 620 个 commits、91 个 PR，其中 84 个已合并；最近 100 个 issues 中 71 个已关闭、29 个仍打开。它是一条持续运转的产研生产线：业务需求以 issue 进入，架构和产品事实沉淀到 docs，任务过程进入 task packets，实现进入 monorepo，测试和部署由 CI/CD 执行，生产运行事实再进入可观测和恢复文档。

## 从商业意图到可执行上下文

一人公司的第一道瓶颈，是把“我想要什么”转成“系统应该怎么变”。

PartnerUp 的文档体系把这个转化过程显式化。`docs/10-prd/` 记录产品 what/why、用户工作流、规则和业务词汇；`docs/20-product-tdd/` 记录跨单元技术实现和边界；`docs/30-unit-tdd/` 记录单元内部设计；`docs/40-deployment/` 记录运行、部署、恢复和可观测事实。`tasks/` 则作为临时推理和工作包的缓冲区，承接目标、guardrails、验证计划和执行结果。

这种结构的价值在于，agent 接到一个模糊需求时，可以沿着固定路径收敛问题：

- 这是商业意图、技术约束、运行现实，还是一次性 artifact。
- durable owner 是 PRD、Product TDD、Unit TDD，还是 deployment truth。
- 影响面是本地组件、跨前后端契约、数据库迁移，还是部署链路。
- 需要什么证据来证明变更已经完成。

这让人类从“逐行指导实现”转向“校准目标和边界”。商业判断仍然由人承担，执行上下文由仓库系统承载。

## 开发效率来自可分派的工程形状

AI agent 的效率依赖上下文质量。一个仓库如果只有代码，agent 只能做局部猜测；一个仓库如果有产品词汇、边界规则、部署事实、验证脚本和历史任务，agent 可以推进更长的任务链。

这个项目的 GitHub 历史显示出一种高密度迭代节奏。issues 的标签集中在 `domain:pr`、`ui/ux`、`domain:event`、`domain:marketing`、`domain:notify` 等产品域，输入覆盖技术工单、产品体验、业务流程、通知机制和运营现实。PR 历史里既有大版本合并，如 PR #5 的 `0.2.0`，也有多轮小步修复、UI 调整、术语统一、生命周期语义修正、场景测试补齐。

这类节奏对传统团队也有价值；对一人公司尤其关键。人类可以连续提出业务判断，agent 将判断分解成代码、测试、文档和部署的可审阅变化。真正重要的产出，是更短的商业反馈周期。

## 前后端架构让 agent 能稳定推进

E2E 链路的速度，还来自前端和后端在架构层面的几个关键决策。它们共同降低了“改一处、猜三处”的成本，让 agent 可以在清晰边界里做较长链条的实现。

后端选择 Hono 作为 HTTP 框架，并从 `apps/backend/src/index.ts` 导出 `AppType`。前端通过 `hc<AppType>()` 创建 Hono RPC client，直接消费后端路由类型。这个设计把 API contract 变成 TypeScript 编译期事实：route shape、payload shape 和大量 response shape 由类型共享，接口破坏会在前端 workspace 中显性暴露。对 agent 来说，这相当于把跨端集成风险提前到编辑器和 CI。

后端内部采用 domain-oriented layered architecture：Controller 只负责 HTTP 和 protocol conversion，业务动作进入 domain use-case，领域规则进入 domain service，持久化集中到 repository 和 Drizzle entity。Zod 与 `@hono/zod-validator` 负责边界校验，Drizzle 负责 schema source of truth，problem-details 让命令失败逐步收敛到稳定错误契约。这样的分层让需求拆解更自然：改协议看 controller，改规则看 use-case/service，改持久化看 repository/entity，改运行副作用看 jobs、notification、operation log。

前端选择 Vue 3 + TypeScript strict mode，并把服务端状态交给 TanStack Vue Query。`queryKeys` 以 PR、Anchor Event、Admin、WeChat、User 等业务域组织，mutation 成功后通过精确 query invalidation 或 cache update 刷新相关视图。这个选择减少了页面级手写 loading/error/cache 协调，让功能代码更接近业务动作本身：读取、提交、刷新、渲染。

前端结构也明显偏 agent-friendly。`src/app` 负责应用 wiring，`src/pages` 只做 route entry，`src/domains` 按业务域拥有 UI、queries、use-cases、model，`src/shared` 承载跨域 primitives 和基础设施，`src/processes` 承载 OAuth、session bootstrap 这类跨域流程。页面组合 domain surface，domain surface 再组合 sections、composites、primitives。这个方向让 agent 在修改一个功能时能先定位 durable owner，再判断组件层级，减少把业务逻辑塞进 route page 的概率。

设计系统同样是效率系统的一部分。前端样式治理把 token 分为 `ref`、`sys`、`dcs`：`ref` 管原始 primitives，`sys` 管 app-wide semantic roles，`dcs` 管少量需要中心命名的 governed outputs。普通组件优先消费 `sys` tokens；共享 UI primitives 如 `Button`、`SurfaceCard`、`ChoiceCard`、`FormField`、`Chip`、`InlineNotice`、`ConfirmDialog` 承载稳定交互和视觉契约。`lint:tokens` 和 strict mode 把视觉漂移纳入自动检查。

这些技术选择共同支撑一人公司的产研效率：Hono RPC 让前后端契约可编译，Vue Query 让服务端状态可组织，domain-first frontend 让 UI 变更可定位，后端 use-case/service/repository 分层让业务规则可演进，设计系统让视觉质量可持续。它们把“写功能”变成一组可验证、可分派、可复用的局部动作。

## 测试是上线前的证据系统

E2E 产研链路的效率需要可靠性托底。这里的测试是一组围绕风险面的证据系统。

后端 PR 校验包含类型检查、单元测试、DB lint 和 scenario tests。`backend-scenario-tests.yml` 使用 Postgres 17 Alpine service，在 CI 中运行真实数据库相关路径。`backend-db-validate.yml` 会重新生成 Drizzle SQL artifacts，并对 `apps/backend/drizzle` 和 `apps/backend/drizzle/meta` 做 drift 检查。跨单元用户旅程则归入 `tests/scenario/`，用于覆盖前端、后端 HTTP 和隔离数据库。

这对一人公司有一个直接好处：人类验收可以集中在关键体验和方案判断上。大量回归风险由自动化证据提前筛出，agent 也可以基于失败输出继续修复。测试由“上线前仪式”变成“agent 可执行的反馈接口”。

## Serverless 是 E2E 链路的放大器

重运维成本会吞噬一人公司的速度。serverless 的重点在这里是多环境部署的轻量化自动化和低成本运行。

当前后端部署到 Aliyun Function Compute，运行时为 `custom.debian12`，HTTP 服务监听 `3000`。后端代码包构建到 `apps/backend/.fc-package`，生产依赖通过独立 FC layer 提供，`BACKEND_COMMIT_HASH` 在部署时注入，让运行包脱离 `.git` 后仍保留构建元数据。OSS 挂载在 `/mnt/oss`，时区固定为 `Asia/Shanghai`。

部署路径由 `.github/workflows/backend-fc-deploy.yml` 触发，但真正控制流集中在 `scripts/ci/fc/deploy_backend.sh`。这是一条很重要的工程判断：GitHub Actions 负责 runner、环境和触发；仓库脚本负责部署逻辑。于是同一条路径可以被 CI 调用，也可以被本地 dry-run 和人工恢复调用。

标准后端发布顺序清晰：

1. 安装依赖。
2. lint migration 和 seed artifacts。
3. 构建并部署 FC migration function。
4. 调用 migration function。
5. 按需发布 `node_modules` layer。
6. 构建后端并打包函数 payload。
7. 注入 commit hash。
8. 部署 FC backend function。
9. 在 `master` 上发布函数版本并更新 `production` alias。
10. 生产 alias 更新成功后创建 backend GitHub Release。

这条链路把“部署成功”从一句主观判断，变成可执行顺序和可审计事实。

## 多环境部署让小团队拥有生产纪律

`develop` 对应 GitHub Actions staging environment，FC 部署到 `LATEST`。`master` 对应 production environment，先部署到 `LATEST`，再发布不可变函数版本，随后更新 `production` alias。后端部署通过 `backend-fc-deploy` concurrency group 串行化，避免多个发布同时推进。

数据库采用 forward-only migration 模型。迁移通过专用 FC migration function 在 VPC 内执行，失败时后端部署停止，恢复路径是修复迁移状态或追加 remediation migration 后重新发布。本地 reset 流程和生产恢复模型被明确区分。

环境变量也被纳入发布纪律。`validate_backend_env.sh` 在触碰迁移或 runtime deploy 前校验 Aliyun、数据库、JWT、WeChat、Job Runner 等关键配置。`AUTH_JWT_SECRET` 在 staging 和 production 至少 32 字符；`LLM_BASE_URL` 存在时要求 `LLM_API_KEY`。这种 fail-fast 设计减少了云控制台、GitHub Environments 和应用 env schema 之间的漂移。

前端部署到 Aliyun ESA，描述文件是 `apps/frontend/esa.jsonc`，构建输出为 `apps/frontend/dist`，SPA fallback 已配置。当前前端是 pull-based deployment model，GitHub Release 表示 source release。这个边界被记录在部署文档中。诚实记录边界，是一人公司保持速度的前提。

## 后台任务也要适配低运维模型

Serverless 环境下，长期驻留进程的成本和可用性假设都不适合这类系统。这个项目把任务模型转向 DB-backed jobs + 外部 tick。

Job Runner Trigger 是独立 FC 函数，路径在 `apps/backend/fc-job-runner-trigger`，它按上海时区定时调用后端 `/internal/maintenance/tick`，并用内部 token 做认证。后端运行信号包括 `/health`、`jobs`、`notification_deliveries`、`operation_logs`、`telemetry_events` 和 `/api/analytics/*`。

这形成了一个轻量运行闭环：定时触发由 FC 承担，任务语义由数据库保存，失败和通知结果被持久化，恢复入口由部署文档记录。对一人公司来说，这比维护长期 worker 集群更符合成本结构。

## GitHub 历史里的系统演进

这个 E2E 链路经历了多轮真实问题塑形。

PR #3 引入了 FC `node_modules` layer、VPC、OSS mount 和后端 FC 部署文档。当时测试记录仍然偏基础，自动部署链路还在早期。

PR #5 的 `0.2.0` 合并覆盖 70 个 commits、476 个文件，包含核心产品、后端、前端、CI/CD 和文档的大规模演进。其中已经出现 FC DB migration workflow、job runner、通知基础设施、部署脚本和文档更新。

PR #93 将文档系统重构为 SVC v7 层次，正式把 `docs/40-deployment/` 作为 deployment truth 层，并记录前端 ESA 部署事实。

4 月底的 deploy commits 继续提高发布系统质量：`build(deploy): move fc rollout into scripts`、`build(deploy): pin ci toolchain and validate backend env`、`build(deploy): align backend deploy trigger inputs`、`build(deploy): enable pnpm 10 workspace deploy`、`build(deploy): default optional fc runtime env`。这些 commit 的主题很清晰：减少 CI/CD 漂移，让工具链、触发条件、环境合约、可 dry-run 脚本变成仓库事实。

Issue #134 展示了一个典型的运行边界讨论：JobRunnerTrigger FC 的环境是否要与 backend 对齐。结论回到 staging tick URL 和 production tick URL 的映射。Issue #185 仍然打开，目标是精确追踪 backend production deploy 的 FC version id，让链路达到 `commit SHA -> FC versionId -> production alias` 的机器可验证程度。

这些历史说明，E2E 产研链路的高效来自把工程纪律压缩进自动化、脚本、文档和 agent 可读上下文。

## 人类仍然是系统里的高杠杆角色

高度自动化让人类的工作位置上移。

人类负责判断商业优先级，决定一个功能是否值得做；负责产品取舍，决定模糊意图应该收敛成哪种体验；负责技术决策，决定系统边界、持久化模型、部署策略和风险承受方式；负责少量关键验收，确认结果是否符合真实使用场景。

Agent 负责把这些判断推进成可审阅的代码、测试、文档和部署变化。serverless 负责把运行环境和多环境发布变轻。CI/CD 负责把变更送到 staging 和 production。运行信号负责把生产反馈带回下一轮判断。

## 仍然需要补齐的边界

这套系统已经跑起来，但仍有明确下一步。

前端 ESA 的实际部署证明链还需要继续补齐。当前 GitHub Actions 可以证明 source release，生产资产是否已经由 ESA 拉取并部署，需要更明确的观测路径。

后端 production deploy 仍在推进 FC version id 精确追踪。当前生产发布会更新 alias 并创建 backend GitHub Release，下一步可以把具体 version id 捕获、校验并输出到部署摘要。

集中告警、BI/dashboard、operation logs 管理 UI 也仍处在文档承认的缺口中。`/internal/maintenance/tick` 当前只避免单个 warm backend process 内重叠，跨实例协调仍需要 DB-global coordination。

这些边界反而让系统更可信。一个高效的一人公司产研链路，需要把已完成的能力和待补齐的风险放在同一张地图里。

## 结语

OnePersonCompany E2E software development 的本质，是把商业判断到生产反馈之间的路径做短、做稳、做可重复。

AI agent 提升实现速度，结构化文档稳定上下文，自动测试提供证据，serverless 降低多环境部署和运行成本，GitHub history 记录真实演进。组合起来，一人公司可以拥有接近完整工程组织的产研闭环，同时保留极低的沟通成本和极快的决策速度。

这篇文章讨论的是把工程做成可自动推进的系统。真正的效率来自这里：人类聚焦判断，agent 推进执行，serverless 承载上线，反馈快速回到下一次商业决策。
