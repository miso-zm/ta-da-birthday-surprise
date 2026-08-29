import assert from "node:assert/strict";
import test from "node:test";

import { getGiftLinkPlatform } from "./gift-link-platform.ts";

test("recognizes Taobao links while preserving the visible host", () => {
  assert.deepEqual(getGiftLinkPlatform("https://m.tb.cn/h.example"), {
    id: "taobao",
    name: "淘宝",
    domain: "m.tb.cn",
    url: "https://m.tb.cn/h.example",
  });
});

test("recognizes JD and WeChat Shop hosts", () => {
  assert.equal(getGiftLinkPlatform("https://u.jd.com/example")?.name, "京东");
  assert.equal(
    getGiftLinkPlatform("https://weixin.qq.com/sph/example")?.name,
    "微信小店",
  );
});

test("keeps an unknown HTTPS host usable as a generic gift link", () => {
  assert.deepEqual(getGiftLinkPlatform("https://gift.example.com/redeem?id=1"), {
    id: "generic",
    name: "礼物链接",
    domain: "gift.example.com",
    url: "https://gift.example.com/redeem?id=1",
  });
});

test("rejects malformed and non-HTTPS links", () => {
  assert.equal(getGiftLinkPlatform("http://m.tb.cn/example"), null);
  assert.equal(getGiftLinkPlatform("not-a-link"), null);
});
