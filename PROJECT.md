# Ta-da! 互动生日惊喜 H5：项目契约

**状态：** Working 0.4（Gate A、Gate B 已通过，准备 Gate C）

**当前里程碑：** Gate B 静态方案已冻结；准备本地 Sender → Preview → Receiver 闭环实现

**项目类型：** Hackathon 可演示 Demo

## 产品目标

让收礼人在手机上用不超过 2 分钟完成一次有情绪递进的生日惊喜：收到邀请、亲手解锁、阅读祝福与回忆、拆开外部礼物、分享体验。

Demo 首要服务于 Hackathon 现场评审，同时必须让普通收礼人无需讲解也能完成主链路。

## 品牌决定

- 产品名称固定为 `Ta-da!`。
- 产品 IP 名称为 `Tada`，定位为收藏心意、制造惊喜的小怪兽。
- Tada 是产品体验的一部分，需要覆盖 Opening、小游戏反馈、回忆、Gift Reveal 和 Share，但不能遮挡主要内容或取代清晰的操作提示。

## 成功标准

- Receiver 从 Opening 到 Share 可以连续完成，无死路或依赖口头解释的步骤。
- 首屏 5 秒内说明“这是给我的生日惊喜”和“下一步做什么”。
- 黄金路径在正常网络下 2 分钟内完成。
- 每个模块通过公共输入与回调连接，可以独立替换。
- 主要体验在 390×844px 完整可用，并覆盖 360-430px 手机宽度。
- 主链路稳定之前，不让高级视觉、后台能力或复杂编辑拖慢进度。

## 用户与演示样例

- 主要用户：通过分享链接进入的生日收礼人。
- 次要用户：通过六步 Sender 创建惊喜并分享链接的送礼人。
- 演示内容使用本地样例 `Mia / Sunny`；真实创建能力接入后由数据替换，不在组件中写死姓名。
- 默认演示小游戏为“找礼物”，另外两种 P0 游戏通过相同配置接口切换。

## P0

### Receiver

- Opening 情绪开场
- Unlock Game：剪刀石头布、找礼物、生日密码
- Birthday Card
- 3:4 Template Composer Scrapbook
- Gift Reveal
- 仅支持外部 HTTPS 礼物链接
- Web Share API 分享，剪贴板作为降级
- 基本加载、错误、键盘和 Reduced Motion 支持

### Sender

- 创建一份惊喜
- 填写双方称呼、祝福和生日
- 选择一个解锁游戏并配置内容
- 选择生日卡与 Scrapbook 模板并上传照片
- 填写并校验 HTTPS 礼物链接
- 生成可分享的 slug 链接

P0 模板范围：Opening 2 个封面模板、Birthday Card 2 个模板、Scrapbook 2 个固定 3:4 模板；Scrapbook 使用 1–3 张照片。

Sender 的六步顺序已经冻结：

1. 基础信息与 Opening
2. 选择并配置 Unlock Game
3. Birthday Card
4. Scrapbook
5. Gift
6. Preview / Publish

六步内部字段与 `Surprise` 映射已经在 Gate A 冻结。Sender 草稿先保存在当前浏览器，Preview 直接读取同一草稿；真实 slug 和持久化之后再接 Supabase。

Gate B 已冻结移动端创建规则：390×844px 单列步骤页、固定顶部进度与保存状态、固定底部单一主按钮；默认内容可直接形成可预览结果。生日在界面中显示月/日，内部仍保存为 `MMDD`；照片按上传顺序自动填槽，仅支持替换和删除。中断后进入恢复页并返回第一个未完成步骤。本地阶段提供真实 Receiver Preview，但不伪造分享 slug，也不要求 Sender 必须走完 Receiver 全流程才能结束创建。

## P1

- 拼照片小游戏
- 更多卡片和 Scrapbook 模板
- 模板内贴纸移动、删除等轻编辑
- 更丰富的 Opening 与 Gift Reveal 动效
- 音乐、声音和触觉反馈
- 数据统计、多人协作或模板市场

## 明确不做

- Canva 式自由画布编辑器
- 人物行走、碰撞、地图或复杂游戏引擎
- 站内支付、礼物购买或物流
- 非 HTTPS 外部链接
- 登录、权限后台和运营管理台（Hackathon P0）
- 在主链路稳定前制作最终插画资产或复杂粒子动画

## 技术与发布默认值

- Next.js App Router、React、TypeScript
- Tailwind CSS；需要可访问基础组件时使用定制后的 shadcn/ui
- Motion 仅在静态页面通过后使用，并先完成 Gift Reveal 样片
- 第一阶段使用类型化本地样例数据
- 第二阶段使用 Supabase 持久化，Vercel 部署
- Receiver 公共入口规划为 `/s/[slug]`
- Sender 入口规划为 `/create`
- 目标浏览器：近两代 iOS Safari、Android Chrome、桌面 Chrome

## 阶段门禁

1. Gate A 已通过：Sender 字段映射、小游戏边界和 P0 动效范围已冻结。
2. Gate B 已通过：Sender 静态六步、小游戏状态和 Tada 场景系统已冻结；完成总控代码契约与任务卡后，方可由用户授权创建独立编码 Worktree。
3. Gate C 本地 Sender → Receiver 闭环通过后，才进入最终静态资产与 Gift / Share 集成。
4. Gate D 静态页面通过后，只制作一个 Gift Reveal 动效样片。
5. Gate E 样片通过后，才批量制作 Opening、Unlock 和 Gift 核心动效。
6. 本地闭环和核心体验稳定后，才接 Supabase、真实 slug、QA 和 Vercel。
