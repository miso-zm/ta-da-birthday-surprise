import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "用户协议 | Ta-da!" };

export default function TermsPage() {
  return <main className={styles.page}>
    <a className={styles.back} href="/create">返回 Ta-da!</a>
    <article className={styles.paper}>
      <h1>用户协议</h1><p className={styles.updated}>更新日期：2026 年 9 月 21 日</p>
      <section><h2>1. 服务内容</h2><p>Ta-da! 用于制作、发布和分享互动生日惊喜。发布会生成一份不可变快照；后续修改草稿会生成新链接，不会改动旧链接。</p></section>
      <section><h2>2. 使用资格与内容责任</h2><p>你应对上传的照片、文字和链接拥有使用权。上传或发布包含他人的照片，即表示你确认已获得照片中人物的同意，或拥有合法使用权。不得上传侵权、违法、侮辱、欺诈或危害他人的内容。首版不用于处理不满 14 周岁儿童的照片。</p></section>
      <section><h2>3. 分享链接</h2><p>链接不是一次性的。任何拿到链接的人都能查看并转发，请不要在惊喜中放入不愿扩散的秘密、证件、地址或其他敏感信息。默认有效期为 1 年。</p></section>
      <section><h2>4. 收回与删除</h2><p>“收回”会立即让查看链接失效，但服务器数据仍保留至原到期日。“永久删除”会删除已发布内容和服务器照片，且无法恢复。两项操作均需使用原发布浏览器中的管理会话。</p></section>
      <section><h2>5. 礼物链接</h2><p>首版只支持淘宝和京东完成“送礼”后生成的官方礼物链接，不接收普通商品详情页。粘贴平台复制的整段分享内容时，Ta-da! 只提取并保存其中的礼物 URL，不保存淘宝提取码。送礼链接可能由最先打开的人领取，请仅分享给信任的对象。Ta-da! 不代替第三方平台完成购买、送达或领取，也不对第三方页面的可用性作保证。</p></section>
      <section><h2>6. 本地记录与服务变更</h2><p>草稿和最近发布入口仅保存在当前浏览器。换设备或清除浏览器数据后可能无法恢复。为了安全、法律或运行需要，服务可能暂停或更新；重大变更会在页面中说明。</p></section>
      <section><h2>7. 投诉与下架</h2><p>如发现侵权或违规内容，请发送邮件至 <a href="mailto:1317282594@qq.com">1317282594@qq.com</a>，并提供相关链接和必要证明。</p></section>
    </article>
  </main>;
}
