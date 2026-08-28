# Ta-da! 项目状态

**更新时间：** 2026-08-28
**当前关卡：** Gate C — 本地闭环实现
**当前总控任务：** `00 总控与集成`

## 一句话状态

Gate C 公共底座已经完成：Sender 草稿、三个藏匿点、字段校验、浏览器草稿读写和不含假 slug 的 Receiver Preview 数据接口均已冻结。下一步可以启动 Sender、Unlock、Memory 三路模块实现。

## 已审核决定

- 产品名称：`Ta-da!`。
- 产品 IP：`Tada`，收藏心意、制造惊喜的小怪兽。
- Receiver 黄金路径：Opening → Unlock → Birthday Card → Scrapbook → Gift Reveal → Share。
- Sender 六步：基础信息与 Opening → Unlock Game → Birthday Card → Scrapbook → Gift → Preview / Publish。
- 移动端 Receiver 优先，主要验收尺寸为 390×844px。
- 第一阶段使用本地数据；本地 Sender → Receiver 闭环稳定后再接 Supabase。
- Scrapbook 使用固定 3:4 Template Composer，不做 Canva 式编辑器。
- P0 游戏：剪刀石头布、找礼物、生日密码；拼照片为 P1。
- Card 与 Scrapbook 各提供 2 个 P0 模板；Scrapbook 使用 1–3 张照片。
- Sender 草稿先保存在浏览器，Preview 使用同一草稿；Supabase 后置。
- 找礼物使用一个固定房间和 3 个藏匿点；生日密码读取生日；剪刀石头布无额外配置。
- Tada 正式 P0 动效只做 Opening、Unlock 成功和 Gift Reveal，并先审核 Gift Reveal 样片。
- Sender 使用移动端单列六步、浏览器草稿恢复和真实 Receiver Preview；本地阶段不伪造分享 slug。
- 找礼物固定三个藏匿点，剪刀石头布最迟第三轮获胜，生日密码两次错误后显示可读提示。
- Tada 复用五种身体母版；核心动效时长约为 1.45 秒、1.1 秒和 2.6 秒。

## 已完成

- 五份共享说明书 0.1 基线。
- Next.js Receiver 空壳与本地演示数据。
- Receiver 六个步骤可以按结构顺序完成。
- Sender 六步顺序确认。
- Ta-da! 产品名称与 Tada 角色方向确认。
- 产品闭环和开发路线流程图。
- 项目专属 `$tada-control` Skill 已建立并通过结构校验。
- Gate A 已通过并记录为 D-004 至 D-007。
- `DECISIONS.md` 决策日志已建立。
- Gate B 三路静态方案已统一审核通过，并记录为 D-008 至 D-011。
- Gate C 公共代码底座已完成：`SenderDraft`、本地存储、Preview 转换和 `/create` 接入位置。
- 技术审核与用户体验审核的分工已记录为 D-012。

## 当前进行中

- `00 总控与集成`：公共代码底座已完成，正在监督三路隔离实现并准备逐项验收。
- `15 Sender 六步与 Preview`：在 `codex/gate-c-sender` Worktree 实现移动端六步创建模块。
- `20 Unlock Games`：在 `codex/gate-c-unlock` Worktree 实现三个轻量小游戏。
- `30 Birthday Card 与 Scrapbook`：在 `codex/gate-c-memory` Worktree 实现 2+2 个静态模板方向。

## Gate C 目标

1. Sender 使用本地草稿完成六步填写。
2. Preview 把同一草稿转换成 Receiver 数据并走通完整主链路。
3. 三种小游戏和 Card / Scrapbook 结构可以独立替换、独立验收。

## 活动编码任务

三路同时进行，目录互不重叠：

- `src/features/sender/**`
- `src/features/unlock/**`
- `src/features/memory/**`

## Gate C 计划并行任务

公共契约就绪后，最多三路独立编码：

- `15 Sender 六步与 Preview`：只改 `src/features/sender/**`。
- `20 Unlock Games`：只改 `src/features/unlock/**`。
- `30 Birthday Card 与 Scrapbook`：只改 `src/features/memory/**`。

## 当前风险

- 现有 Tada 角色图是合并后的设定展示图；不阻塞规划，但正式分层动画需要源文件或重建透明资产。
- `next-env.d.ts` 和 `diagrams/` 存在本轮开始前的工作区改动，当前校准不覆盖它们。
- 当前工作区的完整 ESLint / Next CLI 会在启动阶段长期空闲；本轮已用定向 TypeScript 编译和运行级数据测试通过公共底座，三路集成前必须恢复完整构建检查。

## 下一步唯一行动

等待三路返回静态可操作版本；总控先做契约与技术审查，再逐个集成，最后只把可见 UI 和完整流程交给用户验收。
