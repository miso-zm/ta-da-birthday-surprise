import assert from "node:assert/strict";
import test from "node:test";
import {
  getEarliestMediaExpiry,
  mergeRefreshedMedia,
} from "./receiver-media-recovery.ts";

function surprise(urlSuffix) {
  return {
    id: "publication",
    slug: "receiver-token",
    recipient: { displayName: "Mia" },
    sender: { displayName: "Miso" },
    opening: { templateId: "warm-letter", title: "生日快乐", prompt: "打开看看" },
    unlock: { kind: "rps" },
    memory: {
      kind: "scrapbook",
      scrapbook: {
        templateId: "one-photo",
        description: "虚构回忆",
        slots: [{
          id: "memory-1",
          imageUrl: `http://127.0.0.1/api/media/photo?expires=${urlSuffix}&signature=${"a".repeat(43)}`,
          transform: { x: 0.2, y: -0.1, scale: 1.4 },
        }],
      },
    },
    gift: { kind: "link", title: "", description: "", externalUrl: "https://3.cn/-SafeGift123" },
    share: { title: "生日惊喜", text: "祝福" },
    portrait: {
      templateId: "blue",
      imageUrl: `http://127.0.0.1/api/media/portrait?expires=${urlSuffix}&signature=${"b".repeat(43)}`,
    },
  };
}

test("media refresh changes only signed media URLs so receiver progress can remain mounted", () => {
  const current = surprise("1000");
  const refreshed = surprise("2000");
  const merged = mergeRefreshedMedia(current, refreshed);

  assert.equal(merged.memory.scrapbook.slots[0].imageUrl, refreshed.memory.scrapbook.slots[0].imageUrl);
  assert.equal(merged.portrait.imageUrl, refreshed.portrait.imageUrl);
  assert.deepEqual(merged.memory.scrapbook.slots[0].transform, current.memory.scrapbook.slots[0].transform);
  assert.equal(merged.unlock, current.unlock);
  assert.equal(merged.gift, current.gift);
  assert.equal(merged.opening, current.opening);
});

test("earliest media expiry ignores local preview images and finds the next signed deadline", () => {
  assert.equal(getEarliestMediaExpiry(surprise("2000000000")), 2_000_000_000_000);
  const local = surprise("2000000000");
  local.memory.scrapbook.slots[0].imageUrl = "blob:http://127.0.0.1/local-photo";
  local.portrait.imageUrl = "data:image/png;base64,AAAA";
  assert.equal(getEarliestMediaExpiry(local), null);
});
