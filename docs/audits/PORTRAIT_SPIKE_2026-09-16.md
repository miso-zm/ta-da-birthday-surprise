# D-062 本地抠图技术验证

状态：开发中；仅基础能力通过，视觉质量未通过。不建议接入统一验收预览。

## 实际实现

- `src/lib/portrait/`：输入限制、颜色归一化、透明度合成、裁边、PNG 输出与可取消任务。
- `public/workers/portrait-v1.js`：独立 Worker，单线程 WASM，本地推理，取消和超时终止 Worker。
- 模型与运行时放在本站静态目录，不调用远程照片处理服务；版本、模型校验和许可证已保存。
- 原始 RGB 不去色；输出 alpha 与原图 alpha 相乘。Canvas 编码输出 PNG，不携带原 EXIF。

## 2026-09-16 桌面 Chromium 实测

隔离测试地址 `http://127.0.0.1:3016`，临时目录 `/tmp/tada-portrait-spike.D42Kii`，非统一验收预览、非持久服务。

输入是 scikit-image v0.25.2 公开 astronaut 样本，不是用户私人照片：
https://raw.githubusercontent.com/scikit-image/scikit-image/v0.25.2/skimage/data/astronaut.png

| 检查 | 结果 |
| --- | --- |
| 首次成功输出 | 1576 ms；512×503；375202 bytes |
| 输出格式与透明 | PNG，alpha 最小 0、最大 255 |
| 阶段反馈 | decoding → loading → processing → finishing |
| 20 ms 后取消 | AbortError，实测 20.4 ms，未返回成功图 |
| 损坏 PNG | 可恢复中文错误，实测 2.7 ms |
| 取消、损坏输入后的重试 | 成功，1472.4 ms |
| 浏览器控制台 | 无 error |
| 网络面板 | 本次全部为 127.0.0.1 静态 GET 与 blob URL；未观察到照片上传或第三方请求 |
| 定向 ESLint | 通过 |
| 像素逻辑单测 | 5/5 通过 |

测试截图 `/tmp/tada-portrait-spike.D42Kii/qa.png`；透明输出 `/tmp/tada-portrait-spike.D42Kii/cutout.png`。临时路径不是项目正式资产，不可由应用引用。

## 不能判定通过的部分

- 视觉检查发现人物左侧的旗帜仍有残留。小模型是显著物体检测，不是严格人像分割，不能保证背景干净或多人物选择正确。不能把“有 alpha”写成“抠图质量合格”。
- 仅桌面单样本，约 1.6 秒不是手机性能承诺；Safari、微信、复杂发丝、眼镜和多种肤色尚未验收。
- 首次静态下载约 18.9 MB（WASM 14.2 MB、模型 4.6 MB 及模块），尚未验证国内慢网。应仅在选择照片后按需加载。
- 图片像素限制目前在解码后检查；需增加解码前尺寸检查，降低超大压缩图的内存风险。
- 尚未接入 Sender、草稿、模板合成、发布媒体及 Receiver，也没有完整生产构建结论。

## 下一阶段

先比较人像专用模型/边缘修整方案，用相同样本及多类人像复核质量；同时按批准设计准备真正分层的模板资产。质量门槛通过后，再接入上传编辑与草稿发布闭环，不以示意图或固定人像伪造功能。
