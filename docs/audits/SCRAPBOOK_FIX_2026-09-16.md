# 手帐裁切与加载优化 · 2026-09-16

状态：待验收。main@62f81f9 + 未提交修改；未推送或部署公网。
统一验收预览：http://127.0.0.1:3005/create；运行副本 `/tmp/tada-release-check.FmPPhS`，由 `com.tada.local-preview-3005` 托管。本轮只刷新 Sender / Scrapbook 模块，不改私有配置和既有测试数据。

## 已修复

- Sender 与 Receiver 的照片遮罩是无透明通道的黑白 PNG，但 CSS 默认按 alpha 使用，黑色区域也会显示照片。缩放到 250% 后，照片会越出相框。两端明确设置 `mask-mode: luminance`，保留原有遮罩几何和照片变换数据。浏览器切回 alpha 可复现旧问题，恢复 luminance 后消失。
- 16 张运行图层分别生成 WebP quality 90，原始 PNG 全保留；照片遮罩仍使用原始无损 PNG。Sender 图层从 14,752,234 bytes 降至 335,044 bytes，Receiver 从 15,020,033 降至 331,880 bytes，均约减少 98%。此数值是素材大小，不是页面总流量或加载时间。
- 自动测试逐张检查运行图层尺寸及 alpha 像素完全一致；不降低用户上传照片分辨率，不改变模板位置。

## 更正上一轮 QA

- ISSUE-001 撤销“静默删除”结论：D-057 明确批准减少版式照片数时，提示移除数量并保留前面的照片。实际面板有“移除后面的 2 张照片”文字；关闭面板不修改三图草稿。本轮保留既有行为。
- ISSUE-002 不列为实现缺陷：`getFirstIncompleteSenderStep` 根据当前内容校验决定恢复点，不是历史最大步骤；有效草稿恢复到发布页符合现有契约。恢复最后编辑位置可另作体验提案，本轮不改变批准规则。
- ISSUE-004 撤销：上次测试误用了批量补图 input。实际点击第三格触发第 3 号 input（批量 input 为 0），上传后仅第三格变成“调整”，前两格仍为“添加”。
- ISSUE-003 已进行上述素材优化。旧报告健康分及优先级不再作为当前结论。

## 验证证据

- 运行副本生产构建含 TypeScript 通过；工作目录 typecheck 通过。
- 21 项素材、裁切逻辑、草稿、作品记录和持久化/API 测试通过；定向 ESLint 0 error，保留 Sender 10 条既有 img 建议；diff-check 通过。
- 浏览器：三图版式、先点第三格上传、批量补齐前两格、第一格缩放 250%、关闭减少版式面板保留照片、完成手帐、Preview、刷新恢复及本地发布均走通。
- 已发布 Receiver 三张照片加载成功，第一张保持 scale(2.5)，全部照片使用 luminance 遮罩。360 / 390 / 430px 检查无横向溢出。发布后浏览器无 console error。
- 对比截图：`docs/audits/scrapbook-20260916/before-alpha.png`（临时恢复旧 CSS 复现）、`sender-fixed.png`、`receiver-fixed.png`。

## 范围与限制

本轮修改 Sender / Scrapbook 的 CSS、图层引用与 WebP 资产，增加素材回归测试，不改公共数据契约、草稿恢复规则、上传槽位规则或版式删除规则。
没有宣称全部手帐问题已解决：iPhone Safari、Android Chrome 与微信真机仍待验证；2400×3200 高清母版与海报导出仍是后续独立事项。未新增依赖，未提交，未部署。建议保持当前本地集成结果供用户验收。
