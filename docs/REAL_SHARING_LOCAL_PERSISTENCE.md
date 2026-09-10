# Ta-da! 单机真实分享运行说明

本实现只是腾讯云单机 P0 的应用层与本地测试交付，没有创建、连接或部署任何外部资源。

## 运行变量

| 变量 | 用途 |
|---|---|
| `APP_ORIGIN` | 生成分享和管理链接的唯一可信站点原点；不从请求 `Host` 推导 |
| `TADA_DATA_DIR` | 私有数据根目录，必须可写且位于项目 `public/` 之外 |
| `SHARE_TOKEN_PEPPER` | 派生和哈希 Receiver token / Sender 管理会话，至少 32 字符 |
| `MEDIA_SIGNING_SECRET` | 签发私有图片的短时访问地址，至少 32 字符且与上者独立 |

本地测试可复制 `.env.example` 并替换两个随机秘钥。生产秘钥不得提交到 Git，也不得使用 `NEXT_PUBLIC_` 前缀。

## 数据布局与权限

`TADA_DATA_DIR` 下由应用自动建立 `records/`、`public/`、`media/` 和 `blobs/`。公开 token 原文不落盘，`public/` 只使用加 pepper 的 SHA-256 哈希作索引。图片文件名为服务端不可预测值，对外只签发最长 10 分钟的地址。

运行用户应独占该目录，建议目录权限 `0700`、文件 `0600`。目录不应位于 Nginx 静态目录、Next.js `public/`、Git 工作区或系统临时目录。

单条记录先写同目录临时文件，再原子改名；单进程内写入串行。P0 不支持多实例共写同一目录，不能同时运行两个写入进程。

## 发布与回退边界

- 每次发布为不可变快照；同一幂等操作只生成一份。
- 照片限 JPEG / PNG / WebP，单张最大 12 MiB，输入最大 2400 万像素。服务端自动旋转、缩放并重新编码，不保留 EXIF 等元数据。
- 外部礼物链接仅保存地址，不会由服务器打开或跟随；非 HTTPS、带用户名/密码和明显内网地址会被拒绝。
- 撤回或一年到期后立即停止内容与图片读取，只写失效标记。首版不执行后台硬删除。
- Sender 管理凭证仅在原浏览器的 `HttpOnly` Cookie 中。清除 Cookie 或换设备后，P0 无法找回管理权。
- HTTP + IP 只用于测试数据。真实用户数据必须等备案域名、DNS 和 HTTPS 完成后再开放。

应用代码通过 `PublicationService` 访问持久化，Receiver 、Sender 和内容模块不直接读文件。后续可以用数据库/对象存储实现替换该服务，保留当前路由与 `SurpriseContent` 输入。

回退应先停止应用写入，完整保留 `TADA_DATA_DIR` 备份，再回退单个应用提交。不得为回退代码删除数据目录。本版没有数据库迁移或破坏性清理。

## 反向代理检查

正式接入服务器时，00 需要串行核对：

- Nginx 请求体上限至少 52 MiB，且仅对发布路由开放所需尺寸。
- `TADA_DATA_DIR` 挂载持久磁盘，并纳入加密备份。
- `/s/*`、`/create/manage/*` 和相关 API 保留 `noindex` / `no-store` / `Referrer-Policy` 头。
- 不记录 Cookie、原始 Receiver token、完整礼物 URL 或带签名的图片 URL。
- 部署后必须单独检查 HTTPS 下 Cookie 已启用 `Secure`。
