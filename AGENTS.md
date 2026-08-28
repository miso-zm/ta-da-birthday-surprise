# Ta-da! 互动生日惊喜 H5：Agent 协作规则

## 当前阶段

Receiver 空壳主链路已作为结构基线保留，当前不处理不影响演示结构的小问题。**Gate A 与 Gate B 均已通过**：Sender 字段与交互、三种小游戏规则、Tada 角色系统和 P0 动效规格已经冻结。项目目前进入 **Gate C：本地闭环实现**。

Gate C 先由总控冻结代码层公共契约和任务卡，再由用户明确授权创建编码任务与 Worktree。此阶段只实现本地 Sender → Preview → Receiver 闭环、小游戏和 Memory 结构，不制作最终插画或正式动效，不接入 Supabase。

用户不承担代码、类型或构建审核。冻结契约内的技术实现由总控直接推进并自检；只有可见 UI、真实操作流程、文案含义、Tada 形象与动效感受交给用户审核。

## 开始任何任务前

1. 首先阅读 `STATUS.md` 和 `DECISIONS.md`，再完整阅读本文件以及 `PROJECT.md`、`FLOW.md`、`MODULES.md`、`DESIGN.md`。
2. 在回复中说明本次任务名称、目标、允许修改范围和完成标准。
3. 检查当前 Git 状态和活动任务，确认没有其他任务正在修改相同文件。
4. 如果需求会改变黄金路径、公共模块接口、设计令牌或 P0/P1 范围，停止实现并交回 `00 总控与集成` 决策。

## 任务与权限

- `00 总控与集成` 独占：根目录共享文档、`STATUS.md`、`DECISIONS.md`、项目专属 Skill、应用入口、路由、流程状态机、公共类型、设计令牌、依赖和构建配置。
- `05 Ta-da! 品牌与动效规划`：Gate B 方案已通过；正式资产与动效仍等待后续对应关卡。
- `10 Receiver 空壳主链路`：只负责初始化工程、公共壳层和占位模块，不做最终视觉或业务细节。
- `15 Sender 空壳与预览`：方案已通过；获准编码后只负责 `src/features/sender/**` 内的本地六步创建模块和 Preview 数据准备，不接 Supabase、不修改路由。
- `20 Unlock Games`：只修改 `src/features/unlock/**` 及其模块测试。
- `30 Birthday Card 与 Scrapbook`：只修改 `src/features/memory/**` 及其模块测试。
- `40 Gift Reveal 与 Share`：只修改 `src/features/gift/**`、`src/features/share/**` 及其模块测试。
- `50 视觉资产与动效`：只在已批准模块中替换资产或补充动效，不得改变模块接口。
- `60 Supabase 与真实链接`：本地 Sender → Preview → Receiver 闭环验收前不得启动。
- `90 移动端 QA 与部署`：默认只读；修复任务必须另行授权范围。

除 `00 总控与集成` 外，任何任务都不得自行修改：

- `AGENTS.md`、`PROJECT.md`、`FLOW.md`、`MODULES.md`、`DESIGN.md`
- `STATUS.md`、`DECISIONS.md`、`.agents/skills/tada-control/**`
- `src/app/**`
- `src/lib/surprise-contract.ts`
- `src/styles/tokens.css`
- `package.json`、锁文件和框架配置

## 并行规则

- 并行写代码必须使用独立 Git Worktree；一个 Worktree 对应一个结果明确的任务。
- 同时进行的编码 Worktree 最多 3 个。
- 多个 Agent 不得同时修改共享入口、公共类型或全局样式。
- 子 Agent 优先承担只读调研、接口检查、测试、QA 和代码审查。
- 设计任务先交静态方案并通过审核，之后才允许实现。
- 用户拥有的 Codex 新任务不得由模块任务擅自创建；需要新任务或 Worktree 时，由总控提出明确任务卡并等待用户授权。

## 审核关卡

- Gate A（已通过）：Sender 字段与 Receiver 映射、小游戏 P0 边界、Ta-da! P0 动效清单。
- Gate B（已通过）：Sender 静态六步、小游戏完整状态、Ta-da! 场景分镜和资产清单。
- Gate C：本地 Sender 填写 → Preview → Receiver 完整主链路。
- Gate D：静态页面与 Ta-da! 出现场景。
- Gate E：Gift Reveal 动效样片。
- Gate F：Receiver 移动端情绪节奏和核心动效。
- Gate G：Supabase、真实分享链接、移动端 QA 与部署。

只有用户明确表示“通过”“进入下一阶段”或“开始实现”，才视为通过审核关卡。讨论、提问和要求查看不等于批准。

## 实现顺序

1. 先静态完成态。
2. 再补完整交互状态。
3. 再补错误、空状态和降级。
4. 最后补有明确沟通目的的动效。

不得为了动效改变流程、公共接口或内容结构。

## 每个模块必须覆盖的状态

- 默认状态
- 用户操作中的反馈状态
- 完成状态
- 可恢复的错误状态
- `prefers-reduced-motion` 降级状态（存在动效时）

## 完成汇报格式

每个任务结束时必须提供：

1. 实际完成内容
2. 修改文件范围
3. 可复现的演示步骤
4. 类型检查、测试、构建或截图证据
5. 未完成项与风险
6. 是否建议进入总控集成

## 完成定义

- 只修改授权范围内的文件。
- 模块遵守 `MODULES.md` 的输入与输出，不读取其他模块内部状态。
- 360-430px 宽度可用，390×844px 为主要验收尺寸。
- 键盘焦点、可读文本、按钮对比度和基本屏幕阅读器标签完整。
- 没有科技感渐变、玻璃拟态、霓虹发光或未经批准的视觉语言。
- 相关检查通过，已知限制明确记录。
