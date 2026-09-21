import assert from "node:assert/strict";
import test from "node:test";

import { getGiftLinkPlatform } from "./gift-link-platform.ts";

test("recognizes a verified Taobao gift-link shape without storing a live token", () => {
  assert.deepEqual(getGiftLinkPlatform("https://i.tb.cn/h.SafeGift123?tk=SafeToken123"), {
    id: "taobao",
    name: "淘宝",
    domain: "i.tb.cn",
    url: "https://i.tb.cn/h.SafeGift123?tk=SafeToken123",
    kind: "gift",
  });
});

test("recognizes verified JD gift-link shapes without storing a live token", () => {
  assert.deepEqual(getGiftLinkPlatform("https://3.cn/-SafeGift123"), {
    id: "jd",
    name: "京东",
    domain: "3.cn",
    url: "https://3.cn/-SafeGift123",
    kind: "gift",
  });
  assert.equal(
    getGiftLinkPlatform(`https://trade.m.jd.com/present?id=${"A".repeat(24)}%3D%3D`)?.kind,
    "gift",
  );
});

test("extracts one supported gift link from the full platform share copy", () => {
  assert.equal(
    getGiftLinkPlatform("【京东】https://3.cn/-SafeGift123 「送你一份礼物～」\n点击链接直接打开")?.url,
    "https://3.cn/-SafeGift123",
  );
  assert.equal(
    getGiftLinkPlatform("送你一份礼物\n①去淘宝App搜索礼物提取码：TEST1\n②点击礼物链接https://i.tb.cn/h.SafeGift123?tk=SafeToken123 ③打开淘宝App")?.url,
    "https://i.tb.cn/h.SafeGift123?tk=SafeToken123",
  );
});

test("rejects unverified short links, unknown sites, private paths, and lookalike domains", () => {
  assert.equal(getGiftLinkPlatform("https://m.tb.cn/h.example"), null);
  assert.equal(getGiftLinkPlatform("https://i.tb.cn/h.SafeGift123"), null);
  assert.equal(getGiftLinkPlatform("https://i.tb.cn/h.SafeGift123?tk=SafeToken123&next=https://evil.example"), null);
  assert.equal(getGiftLinkPlatform("https://u.jd.com/example"), null);
  assert.equal(getGiftLinkPlatform("https://3.cn/not-a-gift"), null);
  assert.equal(getGiftLinkPlatform("https://3.cn/-SafeGift123?next=https://evil.example"), null);
  assert.equal(getGiftLinkPlatform("https://weixin.qq.com/sph/example"), null);
  assert.equal(getGiftLinkPlatform("https://gift.example.com/redeem?id=1"), null);
  assert.equal(getGiftLinkPlatform("https://item.taobao.com/item.htm?id=123456789"), null);
  assert.equal(getGiftLinkPlatform("https://item.jd.com/100012345678.html"), null);
  assert.equal(getGiftLinkPlatform("https://item.taobao.com.evil.example/item.htm?id=123456789"), null);
  assert.equal(
    getGiftLinkPlatform("同时含有 https://3.cn/-SafeGift123 和 https://i.tb.cn/h.SafeGift123?tk=SafeToken123"),
    null,
  );
});

test("rejects malformed and non-HTTPS links", () => {
  assert.equal(getGiftLinkPlatform("http://item.taobao.com/item.htm?id=123456789"), null);
  assert.equal(getGiftLinkPlatform("not-a-link"), null);
});
