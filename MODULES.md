# Ta-da! 模块边界与公共契约

**状态：** Main Flow 1.0 已保留；D-052 真实分享持久化边界已冻结

## 目录与所有权

计划中的代码目录：

```text
src/
├── app/s/[slug]/             # 总控：路由与流程壳层
├── app/create/               # 总控：Sender 路由与五步壳层
├── app/api/                  # 总控：发布、上传、撤回与服务端校验
├── features/opening/         # 总控 / Receiver 空壳任务
├── features/sender/          # 15 Sender 空壳与预览
├── features/unlock/          # 20 Unlock Games
├── features/memory/card/     # 30 心意内容体验
├── features/memory/scrapbook/
├── features/gift/            # 40 Gift Reveal 与 Share
├── features/share/
├── lib/surprise-contract.ts  # 总控：公共数据与模块类型
├── lib/sender-preview.ts     # 总控：草稿校验与 Preview 转换
├── lib/sender-draft-storage.ts # 总控：浏览器草稿读写与恢复
├── lib/persistence/          # 临时 C 任务：服务端仓储、资源与状态适配
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
| `birthday` | 可选历史兼容字段；新建草稿与发布不再收集或要求 |
| `opening` | 封面模板、标题和引导文案 |
| `unlock` | 游戏类型及对应配置 |
| `memory` | 二选一联合类型：Card 模板、正文和署名，或 Scrapbook 3:4 模板、照片槽与文字槽 |
| `gift` | 标题、描述和外部 HTTPS URL |
| `share` | 分享标题和分享文案 |

P0 `unlock` 配置使用可辨识联合类型：`none`、`rps`、`find-gift`、`blow-candles`。模块不得通过可选字段组合猜测游戏类型；旧 `birthday-password` 已从运行时契约删除，旧本地草稿读取时会自动迁移为 `blow-candles`。

找礼物的业务目标已冻结为三只可见礼物盒：`sofa-box`（沙发上的绿礼盒）、`plant-box`（花盆旁的黄礼盒）、`rug-box`（地毯上的粉礼盒）。下一次找礼物实现会同步替换现有旧标识 `cabinet-gift`、`sofa-gift`、`plant-gift`，并将旧本地草稿迁移为对应礼物盒；在迁移实现完成前，代码仍保留旧标识。`SenderDraft` 使用版本化本地草稿结构；`SurprisePreview` 不含公开 `slug`，避免本地预览伪装成已发布内容。模块任务只消费这些类型，不得复制或重定义。

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
- 所有者：`30 心意内容体验`
- 限制：只渲染内容，不读取 Scrapbook 数据

### Scrapbook

- 输入：`scrapbook`、`onContinue()`
- 所有者：`30 心意内容体验`
- 限制：使用 1 张、2 张、3 张照片三种固定 3:4 模板槽位；不接受独立标题，只接受一句 0–20 字可选共同说明；Receiver 只读取并渲染每张照片已保存的槽内位移和缩放，不实现逐张说明、槽位移动、排序、旋转、装饰移动或任意拖拽画布
- 海报保存：模块内部可把严格 3:4 的纸页渲染为 PNG；导出只包含纸页内图层，不包含页面导航、操作按钮或纸页外 Tada。保存 / 分享属于次要操作，不推进流程、不改变公共 props，失败必须可重试并保留 `onContinue()` 主路径

### GiftReveal

- 输入：`gift`、`onReveal()`、`onContinue()`
- 输出：礼物是否打开、链接是否合法
- 所有者：`40 Gift Reveal 与 Share`
- 限制：只允许 HTTPS，不自动打开第三方链接

### Share

D-061 / D-062 当前接口：输入 `recipientName`、`gift`、可选 `portrait`、`onReplay()` 与可选 `onExitPreview()`；有主角海报时显示最终 720×720 PNG，无海报时显示 Tada；有有效礼物时显示外链入口，无礼物隐藏。Receiver 不再接收或展示 H5 分享 URL；以下历史接口已被此项取代。

- 输入：`url`、`title`、`text`、`onResult(result)`
- 输出结果：`shared`、`copied`、`cancelled` 或 `failed`
- 所有者：`40 Gift Reveal 与 Share`
- 限制：Web Share 不可用时必须降级复制链接

### Portrait 主角海报

- Sender 草稿可选保存 `templateId`、本地人物贴纸、最终海报和 `centerX / centerY / width / rotation`；大图写入浏览器图片存储，普通草稿只保留轻量引用。
- Preview 与发布内容只暴露 `templateId` 和最终海报，不暴露原照片或中间贴纸。
- 持久化层把最终 PNG 转为私有 `mediaId`；Receiver 加载层只返回短时图片地址。缺失字段对旧数据合法。
- 两模板共用 `src/lib/portrait/**` 合成器和已批准固定图层；不做人脸生成、年龄推断或帽子定位。

## 流程壳层

- 状态枚举：`opening`、`unlock`、`card`、`scrapbook`、`gift`、`share`。
- 只有流程壳层可以推进状态。
- 每个模块仅收到当前步骤需要的数据。
- P0 流程进度继续使用页面内状态；D-052 持久化只替换路由数据来源，不改变 Memory、Unlock、Gift 或 Share 的模块 props。
- 异常边界位于模块外层，模块内部保留可恢复提示。

## Sender 五步契约

已冻结步骤标识与顺序：

```text
basics → unlock → memory → gift → publish
```

- `basics`：双方称呼；Opening 自动生成。
- `unlock`：三种 Unlock Game 或 `none` 直接送达。
- `memory`：Birthday Card 或固定 3:4 Scrapbook 二选一。
- `gift`：礼物信息与 HTTPS 外部链接。
- `publish`：保留本地 Preview；真实分享阶段把当前内容发布为不可变快照并返回新链接。

五步共享同一个本地草稿，最终转换为 `Surprise`。草稿可保留两种 Memory 的编辑内容，但 `memoryKind` 决定校验、Preview 和发布只使用其中一种；模块任务不得把两种内容重新串联。

Gate A 冻结的草稿字段：

| 步骤 | 草稿内容 | 校验与默认 |
|---|---|---|
| `basics` | 收件人称呼、送礼人称呼；Opening 字段由系统内部生成 | 名称 1–20 字；两个输入项纵向排列；默认 `warm-letter` 封面，标题和引导文案随双方称呼自动生成，不向用户开放编辑 |
| `unlock` | `none`、`rps`、`find-gift` 或 `blow-candles` | `none` 直接送达；`rps` 与 `blow-candles` 无 Sender 配置；`find-gift` 在房间插画中选择 `sofa-box`、`plant-box`、`rug-box` 之一 |
| `memory` | `memoryKind` 加对应的 Card 或 Scrapbook 草稿 | Card：2 个模板、正文 10–200 字、默认署名；Scrapbook：1 / 2 / 3 张照片三种固定 3:4 模板、一句 0–20 字可选共同说明，以及与模板对应数量的照片；不包含独立标题。只校验当前选择 |
| `gift` | 礼物名称、描述、外部链接 | 名称 2–40 字；描述不超过 120 字；链接必须为 HTTPS |
| `publish` | 无新增业务字段 | 从草稿生成 `Surprise` 与默认分享文案，提供完整 Preview |

草稿先保存在当前浏览器，Preview 直接读取同一份草稿。浏览器存储实现和照片恢复必须遵守下方 Gate B 契约，不得改变上述字段或 Receiver `Surprise` 结构。

Gate B 冻结的 Sender 交互契约：

- 390×844px 单列壳层；固定顶部返回、步骤进度和保存状态，固定底部单一主按钮。
- 新建流程不显示生日控件；旧草稿和已发布数据可继续携带可选 `birthday` 字段，但它不参与新建校验。
- 草稿恢复先进入恢复页，再定位到第一个未完成步骤。
- 照片按上传顺序填槽；每个固定槽支持拖动照片主体、缩放滑杆 / 捏合与重置，并保存标准化位移和缩放；不提供拖拽排序、槽位移动、旋转或装饰移动。
- Scrapbook 模板选择使用左侧缩略图、右侧名称与说明的列表式选择卡；照片数量由所选模板固定，不提供逐张说明字段。
- 本地最终操作为保存并打开 Receiver Preview；不得生成假的公开 slug，也不得把走完 Preview 设为创建完成条件。
- `15 Sender 五步与预览` 仅修改 `src/features/sender/**`。`src/app/create/**` 路由连接、公共类型与草稿到 `Surprise` 的共享适配由总控负责。

Gate B 冻结的 Unlock 行为契约：

- 找礼物第三次错误只输出文字与方向提示，不高亮正确礼物盒。
- 剪刀石头布最迟第三轮完成，完成回调仍只触发一次。
- 吹蜡烛以麦克风吹气为主，并始终提供按住吹气备用；权限拒绝或检测异常不能形成死路。
- 只有资源或运行故障可以触发 `onFallback`；正常游戏失败不得跳过。
- 所有热点为真实可聚焦按钮，结果具有独立文本状态。

Sender 本地 Preview 和真实分享分开实现：历史 `15 Sender 五步与预览` 不拥有数据库结构；临时 `C-真实分享与跨设备访问` 不改变已批准的五步体验或内容模块内部实现。

## D-052 持久化与权限契约

- `SurpriseContent` 继续是业务内容快照；数据库状态、管理会话、资源 id、发布时间、到期时间与撤回时间位于服务端持久化层，不由内容模块读取。
- 每次发布创建新的 `Surprise` 快照与随机 Receiver 标识，旧记录不原地改内容。随机标识至少 128 位安全随机性，数据库只保存用于查询的哈希。
- Receiver 路由只获得公开查看标识；Sender 管理入口依赖单独的 `HttpOnly` 管理会话。管理凭证不得进入 Receiver URL、`Surprise`、客户端日志、分享内容或分析事件。
- 最小持久化对象为 `sender_sessions`、`surprises`、`media_assets` 和 `publish_operations`。后者以幂等键阻止重复发布；资源先验证并归属到快照，事务完成后才返回分享链接。
- Scrapbook 持久化只保存私有资源 id 与既有 `x / y / scale`。加载适配层为有效 Receiver 请求换取最多 10 分钟的短时图片地址，再组装完整 `Surprise` 交给 `ReceiverShell`。
- `/s/mia-birthday` 始终由本地 Demo 注册表提供；生产随机标识、未知标识、撤回和到期均不得命中 Demo 回退。
- 快照默认一年到期。到期 / 撤回立即停止新的数据读取和照片签名，Receiver 统一显示“这份惊喜已经收起来了”；后台删除属于待确认的技术实施包，其失败重试不改变 Receiver 终态。
- 外部礼物 URL 只作为字符串字段保存和用户主动点击的出口；服务端不得抓取、展开短链或跟随重定向，也不得读取电商账号、Cookie、订单、地址、付款或验证码。

## Worktree 交付契约

每个模块 Worktree 必须：

- 保持公共接口不变。
- 提供静态预览或模块级测试入口。
- 覆盖默认、操作、完成、错误和降级状态。
- 不新增依赖；确需依赖时只提交建议，由总控统一决定。
- 返回改动摘要、验证结果和风险，不自行合并主分支。
