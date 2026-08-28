# Ta-da! 决策记录

本文件只记录用户明确批准、会影响后续任务的决定。具体规范仍以 `PROJECT.md`、`FLOW.md`、`MODULES.md` 和 `DESIGN.md` 为准；`STATUS.md` 只显示当前状态。

| 编号 | 日期 | 状态 | 决定 | 原因 | 影响范围 |
|---|---|---|---|---|---|
| D-001 | 2026-08-28 | 已批准 | 产品名称固定为 `Ta-da!`，IP 角色名为 `Tada`。 | 建立统一品牌和情绪角色。 | PROJECT、DESIGN、全局文案 |
| D-002 | 2026-08-28 | 已批准 | Receiver 黄金路径固定为 Opening → Unlock → Birthday Card → Scrapbook → Gift Reveal → Share。 | 保证两分钟内形成完整情绪递进。 | FLOW、Receiver 壳层 |
| D-003 | 2026-08-28 | 已批准 | Sender 固定六步：基础信息与 Opening → Unlock Game → Birthday Card → Scrapbook → Gift → Preview / Publish。 | 创建过程完整，同时避免后台式复杂度。 | FLOW、MODULES、Sender |
| D-004 | 2026-08-28 | 已批准 | Sender 采用 Gate A 字段范围：Card 与 Scrapbook 各 2 个 P0 模板；Scrapbook 上传 1–3 张照片；字段使用明确长度与 HTTPS 校验。 | 控制 Demo 工作量并保证内容质量。 | PROJECT、MODULES、Sender、Memory |
| D-005 | 2026-08-28 | 已批准 | Sender 草稿先保存在当前浏览器，Preview 直接读取同一草稿；真实 slug 和持久化留到 Supabase 阶段。 | 先跑通本地闭环，避免数据层拖慢主体验。 | FLOW、MODULES、Sender、Supabase |
| D-006 | 2026-08-28 | 已批准 | 三个 P0 游戏采用轻量自研：找礼物为一个固定房间和 3 个藏匿点；生日密码自动读取生日；剪刀石头布无 Sender 配置。 | 统一视觉、降低开源项目接入风险并控制工作量。 | FLOW、MODULES、Unlock Games |
| D-007 | 2026-08-28 | 已批准 | Tada 正式 P0 动效只做 Opening、Unlock 成功和 Gift Reveal；先审核 Gift Reveal 样片，再批量制作。 | 把时间投入情绪关键点，并先验证角色一致性。 | DESIGN、Ta-da! 资产与动效 |
| D-008 | 2026-08-28 | 已批准 | Sender 采用 390×844px 单列六步壳层：固定顶部进度与保存状态、固定底部单一主按钮；提供审核通过的默认内容、浏览器草稿恢复和真实 Receiver Preview。本地阶段不伪造可分享 slug，也不强制用户走完 Receiver 才能结束创建。 | 降低移动端创建负担，同时让本地演示诚实、可恢复。 | FLOW、MODULES、Sender |
| D-009 | 2026-08-28 | 已批准 | 三种游戏按 Gate B 规则实现：找礼物固定藏在柜子、沙发靠垫或花盆，第三次点错只给文字与方向提示；剪刀石头布第三轮保证获胜；生日密码两次错误后显示可读生日与四位格式；仅资源或运行故障允许跳过。 | 保证 20–40 秒内可完成，保留游戏感且不形成死路。 | FLOW、MODULES、Unlock Games |
| D-010 | 2026-08-28 | 已批准 | Tada 以不对称薄荷绿小角、奶油身体、暖棕描边和珊瑚脸颊为识别锚点；失败反馈保持好奇与鼓励；Gift Reveal 隐藏心意袋；P0 复用等待、提问、庆祝、手持、探头五种身体母版。 | 用少量可复用资产维持角色一致性，并控制正式资产工作量。 | DESIGN、Ta-da! 静态资产与动效 |
| D-011 | 2026-08-28 | 已批准 | 三段核心动效目标时长为 Opening 约 1.45 秒、Unlock 成功约 1.1 秒、Gift Reveal 样片约 2.6 秒；均为一次性播放并停在静态完成态，Gift Reveal 使用 6–10 片彩纸，Reduced Motion 直接显示完成态。 | 冻结节奏与降级边界，避免后续动效无限扩张。 | DESIGN、Ta-da! 动效 |

## 变更规则

- 新决定按编号追加，不覆盖历史记录。
- 如果用户改变决定，新增一条“取代 D-xxx”的记录，并同步更新受影响契约。
- 讨论稿、备选方案和 Agent 建议不作为已批准决定。
