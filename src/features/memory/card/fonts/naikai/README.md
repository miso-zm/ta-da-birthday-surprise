# 内海字体 Light：Birthday Card 本地字库

- 用途：仅用于「递到你手里的信」卡片内的收件人、祝福正文与署名；卡片外标题、按钮与其他 UI 不使用此字体。
- 上游：`max32002/naikaifont`，`tw/NaikaiFont-Light.ttf`。
- 上游版本：本任务使用的仓库工作区版本；源地址为 https://github.com/max32002/naikaifont 。
- 授权：SIL Open Font License 1.1，完整文本见 `OFL-1.1.txt`。
- 打包：由上游 TTF 转换为本地 WOFF2，并按 Unicode 范围拆为 5 个文件。样本文本只会请求所含字符对应的分包，不依赖 CDN 或第三方字体服务。
- 展示策略：`font-display: block`；组件等待 `document.fonts.load()` 完成后一次显示书信文字，避免普通字体先出现、再跳变为手写体。

如需升级字体，请重新从上游授权源生成 WOFF2 分包，并保留本说明与 OFL 文件。
