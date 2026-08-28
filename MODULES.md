# Ta-da! 模块边界与公共契约

**状态：** Working 0.4（Gate A、Gate B 已通过，模块交互契约已冻结）

## 目录与所有权

计划中的代码目录：

```text
src/
├── app/s/[slug]/             # 总控：路由与流程壳层
├── app/create/               # 总控：Sender 路由与六步壳层
├── features/opening/         # 总控 / Receiver 空壳任务
├── features/sender/          # 15 Sender 空壳与预览
├── features/unlock/          # 20 Unlock Games
├── features/memory/card/     # 30 Birthday Card 与 Scrapbook
├── features/memory/scrapbook/
├── features/gift/            # 40 Gift Reveal 与 Share
├── features/share/
├── lib/surprise-contract.ts  # 总控：公共数据与模块类型
├── content/demo-surprise.ts  # 总控：本地演示数据
└── styles/tokens.css         # 总控：设计令牌
```

模块只能通过公共 props 和回调通信，不得导入其他模块的内部组件、状态或测试工具。

## 公共数据契约

`Surprise` 至少包含：

| 字段 | 含义 |
|---|---|
| `id`, `slug` | 惊喜标识与分享路径 |
| `recipient`, `sender` | 双方显示名称 |
| `birthday` | `MMDD` 格式生日，用于内容和密码配置 |
| `opening` | 封面模板、标题和引导文案 |
| `unlock` | 游戏类型及对应配置 |
| `card` | 贺卡模板、正文和署名 |
| `scrapbook` | 3:4 模板、照片槽与文字槽数据 |
| `gift` | 标题、描述和外部 HTTPS URL |
| `share` | 分享标题和分享文案 |

三种 `unlock` 配置使用可辨识联合类型：`rps`、`find-gift`、`birthday-password`。模块不得通过可选字段组合猜测游戏类型。

## 模块接口

### Opening

- 输入：`recipient`、`sender`、`opening`
- 输出：`onOpen(): void`
- 所有者：总控 / `10 Receiver 空壳主链路`
- 限制：不读取后续模块数据，不直接修改路由

### UnlockGame

- 输入：`config: UnlockConfig`、`onComplete(result)`、`onFallback(reason)`
- 输出结果：游戏类型、尝试次数、是否使用降级
- 所有者：`20 Unlock Games`
- 限制：完成回调只触发一次，不拥有流程导航

### BirthdayCard

- 输入：`recipient`、`sender`、`card`、`onContinue()`
- 所有者：`30 Birthday Card 与 Scrapbook`
- 限制：只渲染内容，不读取 Scrapbook 数据

### Scrapbook

- 输入：`scrapbook`、`onContinue()`
- 所有者：`30 Birthday Card 与 Scrapbook`
- 限制：使用固定 3:4 模板槽位，不实现任意拖拽画布

### GiftReveal

- 输入：`gift`、`onReveal()`、`onContinue()`
- 输出：礼物是否打开、链接是否合法
- 所有者：`40 Gift Reveal 与 Share`
- 限制：只允许 HTTPS，不自动打开第三方链接

### Share

- 输入：`url`、`title`、`text`、`onResult(result)`
- 输出结果：`shared`、`copied`、`cancelled` 或 `failed`
- 所有者：`40 Gift Reveal 与 Share`
- 限制：Web Share 不可用时必须降级复制链接

## 流程壳层

- 状态枚举：`opening`、`unlock`、`card`、`scrapbook`、`gift`、`share`。
- 只有流程壳层可以推进状态。
- 每个模块仅收到当前步骤需要的数据。
- P0 使用页面内状态；Supabase 接入时替换数据来源，不改变模块 props。
- 异常边界位于模块外层，模块内部保留可恢复提示。

## Sender 六步契约

已冻结步骤标识与顺序：

```text
basics → unlock → card → scrapbook → gift → publish
```

- `basics`：基础信息与 Opening。
- `unlock`：选择并配置一个 Unlock Game。
- `card`：Birthday Card。
- `scrapbook`：固定 3:4 Template Composer。
- `gift`：礼物信息与 HTTPS 外部链接。
- `publish`：本地为 Preview；Supabase 阶段再启用 Publish。

六步共享同一个本地草稿，最终转换为 `Surprise`。Gate A 已冻结字段、默认值和校验边界，Gate B 已冻结草稿恢复与 Preview 交互；模块任务不得自行改变。

Gate A 冻结的草稿字段：

| 步骤 | 草稿内容 | 校验与默认 |
|---|---|---|
| `basics` | 收件人称呼、送礼人称呼、生日月日、Opening 模板、标题、引导文案 | 名称 1–20 字；生日为有效 `MMDD`；标题自动生成但可编辑；2 个封面模板 |
| `unlock` | `rps`、`find-gift` 或 `birthday-password` | `rps` 无配置；`find-gift` 选择 `cabinet-gift`、`sofa-gift`、`plant-gift` 之一；密码答案由生日生成 |
| `card` | 模板、祝福正文、署名 | 2 个模板；正文 10–240 字；署名默认等于送礼人称呼 |
| `scrapbook` | 模板、标题、照片槽和说明 | 2 个固定 3:4 模板；1–3 张照片；说明可选且不超过 30 字 |
| `gift` | 礼物名称、描述、外部链接 | 名称 2–40 字；描述不超过 120 字；链接必须为 HTTPS |
| `publish` | 无新增业务字段 | 从草稿生成 `Surprise` 与默认分享文案，提供完整 Preview |

草稿先保存在当前浏览器，Preview 直接读取同一份草稿。浏览器存储实现和照片恢复必须遵守下方 Gate B 契约，不得改变上述字段或 Receiver `Surprise` 结构。

Gate B 冻结的 Sender 交互契约：

- 390×844px 单列壳层；固定顶部返回、步骤进度和保存状态，固定底部单一主按钮。
- 生日以月/日控件呈现，转换后仍为有效 `MMDD`。
- 草稿恢复先进入恢复页，再定位到第一个未完成步骤。
- 照片按上传顺序填槽，仅替换、删除，不提供拖拽排序。
- 本地最终操作为保存并打开 Receiver Preview；不得生成假的公开 slug，也不得把走完 Preview 设为创建完成条件。
- `15 Sender 空壳与预览` 仅修改 `src/features/sender/**`。`src/app/create/**` 路由连接、公共类型与草稿到 `Surprise` 的共享适配由总控负责。

Gate B 冻结的 Unlock 行为契约：

- 找礼物第三次错误只输出文字与方向提示，不高亮正确热点。
- 剪刀石头布最迟第三轮完成，完成回调仍只触发一次。
- 生日密码两次错误后输出可读生日和 `MMDD` 格式提示。
- 只有资源或运行故障可以触发 `onFallback`；正常游戏失败不得跳过。
- 所有热点为真实可聚焦按钮，结果具有独立文本状态。

Sender 本地空壳和 Supabase 分开实现：`15 Sender 空壳与预览` 不拥有数据库结构，`60 Supabase 与真实链接` 不改变已批准的六步体验。

## Worktree 交付契约

每个模块 Worktree 必须：

- 保持公共接口不变。
- 提供静态预览或模块级测试入口。
- 覆盖默认、操作、完成、错误和降级状态。
- 不新增依赖；确需依赖时只提交建议，由总控统一决定。
- 返回改动摘要、验证结果和风险，不自行合并主分支。
