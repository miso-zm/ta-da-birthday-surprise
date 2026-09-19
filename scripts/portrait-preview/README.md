# 人像贴纸模块预览

仅本地 QA，不是正式 Sender 入口。代码分别位于 `src/lib/portrait/remove-background.ts` 和 `sticker.ts`。不修改公共数据契约。

本页只验证真实上传、抠图、取消/重试和描边这些可操作功能。单张模板贴图属于内部过程资产，不再制作浏览器陈列页；透明度、尺寸、留白与空隙由自动测试验证，用户验收从完整模板合成稿开始。

在独立临时目录准备：

- 使用项目 esbuild 将上述两个文件分别 bundle 为 ESM `helper.js`、`sticker.js`。
- 复制本目录 `index.html` 及 `public/workers`、`public/vendor`、`public/models`。
- 可选将公开测试照片放到 `sample.png`；未提供时可自行选择本地图片。
- 本地静态服务绑定 `127.0.0.1`。必须通过 HTTP URL 访问，不用 `file://`。

本次运行来源：`/tmp/tada-portrait-spike.D42Kii`，http://127.0.0.1:3016/ 。临时目录和服务不是长期可用承诺。

验收：选择照片 → 等待处理 → 对比原抠图与人物贴纸。贴纸按人像显示宽 280px 生成，输出 2× PNG，外围预留 12px 透明空间；底部不规则撕纸蒙版、暖白纸边与阴影已经合并进同一 PNG。模板合成时必须使用最终显示宽重算，不能无约束放大已生成贴纸，否则线宽也会变大。主体位置需计入返回的 `contentOffset`。

取消及处理失败保留上次成功结果。无循环动画；未接草稿或发布。明显背景残块不会因加描边而消失。

内覆盖修订：保持外扩 3px，显示用人物 alpha 向内收 1px，露出其下的暖白贴纸层来覆盖灰边；原抠图不修改。中心 RGB 不变，极细发丝可能减少。测试页标注“外描边 3px / 内覆盖 1px”表示新版已加载。

验证命令：`npx tsx --test src/lib/portrait/*.test.mjs`、`npm run typecheck`、`npx eslint src/lib/portrait`。
