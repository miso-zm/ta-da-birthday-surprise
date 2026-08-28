# Receiver 与 Sender 流程

**状态：** Draft 0.1，等待用户审核

## Receiver 黄金路径

```text
打开 /s/[slug]
  ↓
加载惊喜数据
  ↓
Opening
  ↓ onOpen
Unlock Game（配置决定三种游戏之一）
  ↓ onComplete
Memory：Birthday Card
  ↓ onContinue
Memory：Scrapbook
  ↓ onContinue
Gift Reveal
  ↓ onReveal / onContinue
Share
```

Birthday Card 与 Scrapbook 属于同一个 Memory 阶段，但在黄金路径中依次展示，确保收礼人能看到两种内容；不得通过一个默认隐藏的标签页跳过其中之一。

## 进入与加载

- 路径：`/s/[slug]`。
- 读取类型化 `Surprise` 数据；阶段 B 使用本地样例，阶段 F 替换为 Supabase 数据源。
- 加载时显示与页面结构一致的占位骨架，不使用全屏旋转图标。
- slug 不存在或数据无效时显示温和的错误页，并提供“重新加载”。
- 错误页不得展示未校验的外部链接或部分隐私内容。

## Opening

目标：让用户在 5 秒内明白这是专属生日惊喜，并主动开始。

- 显示收件人、发件人、短引导和一个主要按钮。
- 主要操作：`拆开看看`。
- 首次用户操作前不自动播放声音。
- `onOpen` 只负责通知流程进入 Unlock，不读取小游戏状态。

## Unlock Game

Sender 配置决定 Receiver 看到哪一种游戏；Receiver 正常流程中不显示游戏选择器。

### 找礼物（默认演示）

- 显示一个静态 2D 场景和多个可点击热点。
- 点错物体时给出短提示，不扣次数。
- 点中礼物后显示明确完成反馈，并触发一次 `onComplete`。

### 剪刀石头布

- Receiver 选择石头、剪刀或布，系统产生对手结果。
- 获胜后完成；平局或失败可无限重试。
- 每轮必须明确读出双方选择和结果。

### 生日密码

- 输入四位月日数字，演示值为 `0828`。
- 忽略空格和非数字格式字符后比较。
- 输入错误可以重试；连续两次错误后显示更明确提示。
- 正确后触发一次 `onComplete`。

### 通用规则

- 游戏完成回调具有幂等性，重复点击不能多次推进流程。
- 游戏内部不得直接导航到 Memory。
- 游戏资源失败时提供“跳过并继续”的受控降级，避免 Demo 死路；该事件需要可记录。

## Memory：Birthday Card

- 展示模板、祝福正文、收发双方称呼。
- 祝福正文支持合理长度换行；过长数据在 Sender 阶段限制，不在 Receiver 静默截断。
- 阅读完成后通过唯一主按钮进入 Scrapbook。

## Memory：Scrapbook

- 固定 3:4 Template Composer，不提供自由画布。
- 模板定义背景、照片槽、装饰层和文字槽。
- 照片按槽位裁切并保持可读主体；无照片时显示设计完成的缺省槽，不显示破图。
- 阅读完成后进入 Gift Reveal。

## Gift Reveal

- 初始只显示未打开礼物和操作提示。
- 用户操作后显示礼物标题、描述和外部链接按钮。
- 外部地址必须为可解析的 `https://` URL，否则按钮禁用并显示解释。
- 不内嵌第三方购物页，不自动跳转。
- `onReveal` 记录已拆开状态；用户主动点击主按钮后进入 Share。

## Share

- 优先调用 Web Share API。
- 不支持或调用失败时提供复制当前分享链接。
- 复制成功或失败必须有可感知反馈。
- 分享取消视为正常结果，不显示错误警报。
- 页面保留重新查看惊喜的入口，但不重置已完成数据。

## 返回与恢复

- 浏览器刷新后，阶段 B 可以重新从 Opening 开始；阶段 F 再决定是否持久化进度。
- 浏览器返回键不得进入空白页或不可恢复状态。
- P0 不提供任意步骤导航；用户通过流程按钮向前推进。
- QA 可以使用开发态跳转工具测试模块，但工具不得出现在生产 Demo。

## Sender 轮廓（第二阶段）

```text
基本信息
  ↓
选择并配置 Unlock Game
  ↓
编辑 Birthday Card
  ↓
选择 Scrapbook 模板并上传照片
  ↓
填写 HTTPS 礼物链接
  ↓
预览 Receiver 主链路
  ↓
发布并复制 /s/[slug]
```

Sender 与 Receiver 共用 `Surprise` 数据契约，不复用 Receiver 的页面组件或流程状态。
