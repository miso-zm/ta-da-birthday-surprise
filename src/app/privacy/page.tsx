import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "隐私政策 | Ta-da!" };

export default function PrivacyPage() {
  return <main className={styles.page}>
    <a className={styles.back} href="/create">返回 Ta-da!</a>
    <article className={styles.paper}>
      <h1>隐私政策</h1><p className={styles.updated}>更新日期：2026 年 9 月 21 日</p>
      <section><h2>1. 谁在处理信息</h2><p>Ta-da! 由 Miso（个人开发者）运营。如需查询、更正或删除信息，请发送邮件至 <a href="mailto:1317282594@qq.com">1317282594@qq.com</a>。</p></section>
      <section><h2>2. 我们处理哪些信息</h2><ul><li>称呼、祝福文字、官方送礼链接和惊喜设置。</li><li>手帐照片会在发布时上传并保存，供持链接者查看。</li><li>主角原照仅在当前浏览器处理；发布时只上传生成后的海报。</li><li>草稿、人物贴纸及最近发布入口保存在当前浏览器。管理会话使用 HttpOnly Cookie。</li><li>吹蜡烛仅在你主动开启后于本机实时分析麦克风强度，不录音、不上传。</li></ul></section>
      <section><h2>3. 用途与保存</h2><p>信息仅用于恢复草稿、生成与展示生日惊喜、管理链接和保护服务安全。发布链接默认有效 1 年；收回后会立即停止访问，但数据保留至原到期日；选择“永久删除”后，已发布内容与服务器照片会被删除。为防止已删除链接被重新创建，我们会保留不含正文和照片的最小删除记录。本机草稿需由你在浏览器中另行删除。</p></section>
      <section><h2>4. 分享与第三方</h2><p>查看链接不主动进入搜索引擎，但任何拿到链接的人都可以查看并继续转发。主动打开淘宝或京东链接后，相应平台的隐私规则适用。Ta-da! 不出售个人信息。</p></section>
      <section><h2>5. 照片与未成年人</h2><p>照片可能包含他人的肖像与个人信息。上传或发布照片，即表示你确认已获得照片中人物的同意，或拥有合法使用权。首版不用于处理不满 14 周岁儿童的照片，请不要上传。</p></section>
      <section><h2>6. 你的权利</h2><p>你可以请求查询、说明、更正或删除信息，也可通过原发布浏览器收回或永久删除作品。若本政策有重大变更，我们会在页面中更新。</p></section>
    </article>
  </main>;
}
