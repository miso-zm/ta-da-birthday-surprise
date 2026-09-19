# Ta-da! 新视觉规范替换 QA

**日期：** 2026-08-28  
**范围：** 当前 Demo 的全局颜色 Token、排版、按钮、输入框、选择卡、内容卡和移动端页面表面样式  
**结论：** 视觉公共底座通过，可交给用户做 UI 感受验收。

## 对照依据

- 视觉真源：`codex-clipboard-e4b78586-d7ac-48f0-94ea-9e1e5dfab31e.png`。
- 规范真源：`DESIGN.md`。
- 验收尺寸：390×844px。
- Sender 状态：第 5 步 Preview。
- Receiver 状态：Opening。
- 并排证据：`/tmp/tada-design-comparison-final.png`。
- Sender 证据：`/tmp/tada-ui-create-final.png`。
- Receiver 证据：`/tmp/tada-ui-receiver-opening-final2.png`。
- 圆体更新证据：`/tmp/tada-ui-rounded-font-390.png`。
- 最终字体方案 7 证据：`/tmp/tada-font7-create.png`、`/tmp/tada-font7-receiver.png`。
- `#F8F4EE` 背景证据：`/tmp/tada-bg-f8f4ee-create-stable.png`、`/tmp/tada-bg-f8f4ee-receiver.png`。
- 三级字重证据：`/tmp/tada-three-font-weights-final.png`。

## 迭代记录

1. 第一轮发现旧版组件仍使用深棕粗框、厚下沉阴影和不统一的粉红色；已统一替换为暖米色 1px 边框、柔和阴影与新版色板。
2. 第二轮发现页面标题被程序化聚焦后出现浏览器蓝色外框，主按钮颜色偏深；已移除标题视觉焦点框，并统一为 `#FF8F86` 珊瑚底与暖棕文字。
3. 最终复查未发现阻塞本轮视觉公共底座的 P0、P1 或 P2 问题。

## 核心表面检查

- 排版：最终选择方案 7「源泉圆体」。标题、正文、按钮、输入和辅助文字已统一继承 `--font-rounded`；浏览器检查确认字体加载成功，未发现第二套 UI 字体。全站字重只保留 500 / 600 / 700：正文和辅助文字 500、标签与次级强调 600、标题与主按钮 700。用户标注的草稿说明文字计算字重为 500。
- 间距：390px 页面无横向溢出，卡片内边距和区块间距保持稳定。
- 颜色：画布、白卡、珊瑚主操作色、暖棕文字、浅米边框均来自全局 Token。
- 背景：Sender 与 Receiver 的 `html`、`body` 计算色均为 `rgb(248, 244, 238)`，与冻结值 `#F8F4EE` 一致；白卡和珊瑚按钮未被连带修改。
- 圆角与阴影：UI 只使用 12 / 20 / 28 / 圆形四档圆角，阴影为低对比柔和层级。
- 组件：主按钮、输入、选择卡、提示条、预览卡和 Receiver 主场景卡已切换新版样式。
- 文案：本轮未改产品逻辑或页面文案，仅保留已冻结的五步 Sender 与 Receiver 条件流程。
- 交互：Sender 草稿恢复、继续编辑和 Receiver Opening 入口均可操作；类型检查通过。

## 本轮不包含

- Tada 正式透明插画、游戏缩略图和场景资产；它们属于独立视觉资产任务，不能用 Emoji 或临时 CSS 图形冒充。
- 找礼物和剪刀石头布的最终场景视觉仍不包含在本轮视觉底座中；吹蜡烛已完成轻量功能版本，正式蛋糕插画与 Tada 动效仍属于独立资产任务。
- 高级动效和 Supabase 发布链路。
- 正式部署字体文件打包；源泉圆体采用 SIL Open Font License 1.1，发布到其他设备前仍需压缩为 Web Font 并随站点发布。

**最终结果：通过（视觉公共底座范围）。**

---

# Sender / Receiver 主按钮统一 QA

**日期：** 2026-09-11  
**范围：** Sender 与 Receiver 主流程的实心主操作按钮  
**结论：** C 方案已统一落地，可进入用户验收。

## 对照依据

- 用户参考图：`/var/folders/9j/jchr0tc93_30jkxgqnkcmpr00000gn/T/codex-clipboard-06ff801d-6d82-416e-b1e2-2ab63ae74d86.png`。
- 已批准设计板：`/Users/sunny/.gstack/projects/miso-zm-ta-da-birthday-surprise/designs/welcome-button-motion-20260911/design-board.html`。
- 方案批准记录：`/Users/sunny/.gstack/projects/miso-zm-ta-da-birthday-surprise/designs/welcome-button-motion-20260911/approved.json`。
- 实现预览：`http://127.0.0.1:3003/create` 与 `http://127.0.0.1:3003/s/mia-birthday`。
- 实现截图：Codex 应用内浏览器 390×844 内联捕获（该浏览器 API 未暴露本地文件路径）。

## 对照结果

- 全局：珊瑚色纸感主按钮与页面的暖米色手帐风格一致，未引入新的视觉语言。
- 细节：按钮使用大小错落、随机分布的礼物、蛋糕、爱心面性图标，已删除信封图标；右侧星光仅作轻微呼吸，不弹跳。
- 尺寸：Sender 首页与 Receiver Opening 按钮在 390px 视口下约 82px 高；标准流程按钮 60px 高。
- 响应式：360 / 390 / 430px 均无横向溢出，主按钮宽度和图标密度保持稳定。
- 可用性：按钮文字保持真实 DOM 文本，装饰层 `aria-hidden` 且不拦截点击；`prefers-reduced-motion` 下停止星光动画。
- 范围：次级按钮、文字链接、小游戏操作件、礼物平台卡片及危险性撤回操作保持原状。
- 可见差异复查：未发现需要修复的 P0、P1 或 P2 视觉偏差。

**最终结果：passed。**

---

# Sender / Receiver 启动按钮矢量重绘 QA

**日期：** 2026-09-11  
**视觉真源：** `/var/folders/9j/jchr0tc93_30jkxgqnkcmpr00000gn/T/codex-clipboard-ae6a7fa8-6587-4ce2-8728-af887811824b.png`  
**实现截图：** `/tmp/tada-receiver-svg-button-390x844.png`、`/tmp/tada-sender-svg-button-450x863.jpg`  
**并排对照：** `/tmp/tada-button-reference-comparison.png`  
**验收视口：** Codex 应用内浏览器 450×863（页面主体限宽 430px）  
**验收状态：** Sender 首次启动页、Receiver Opening 启动页。

## Findings

- 未发现可操作的 P0、P1 或 P2 问题。
- 之前的透明切图边缘和双层白色轮廓已消失；按钮主体改为纯 CSS 色块，装饰仅使用 Phosphor 图标库的 SVG。
- 按钮高度由约 82px 收至最大 68px，保持与首屏插画的空间比例。

## 五项忠实度检查

- 字体：使用产品现有圆体与 700 字重，Sender / Receiver 标签层级一致。
- 间距：宽度与首页原槽位一致，高度减小后与底部说明保持清晰留白。
- 颜色：主体使用 `--coral-action`，文字使用 `--on-dark`，星光使用现有黄色系。
- 资产：按钮内部图像数量为 0，SVG 图标为 8；不再读取 Sender / Receiver 按钮 PNG。
- 文案：保留「开始准备」和「拆开看看」，无产品文案变更。

## 比较历史

1. P2：原实现使用按钮 PNG，存在明显外圈光晕与过高问题。
2. 修复：移除两处按钮切图，改用纯色按钮与图标库 SVG，最大高度调整为 68px。
3. 复查：并排图中实现侧已无白边或透明边缘，按钮更轻巧，两处主交互可用，控制台无错误。

## Implementation Checklist

- [x] Sender 启动按钮移除 PNG。
- [x] Receiver 启动按钮移除 PNG。
- [x] 按钮文案改为真实 DOM 文本。
- [x] 图标使用 SVG 图标库，装饰层不拦截点击。
- [x] `prefers-reduced-motion` 下停止星光动画。

**final result: passed**
