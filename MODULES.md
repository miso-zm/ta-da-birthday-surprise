# 模块边界与公共契约

**状态：** Approved 0.1

## 目录与所有权

计划中的代码目录：

```text
src/
├── app/s/[slug]/             # 总控：路由与流程壳层
├── features/opening/         # 总控 / Receiver 空壳任务
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

## Worktree 交付契约

每个模块 Worktree 必须：

- 保持公共接口不变。
- 提供静态预览或模块级测试入口。
- 覆盖默认、操作、完成、错误和降级状态。
- 不新增依赖；确需依赖时只提交建议，由总控统一决定。
- 返回改动摘要、验证结果和风险，不自行合并主分支。
