import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterCardContent } from "./letter-card-content.tsx";

test("letter recipient, blessing and signature render before any client font lifecycle", () => {
  const message = "愿你在新的一岁里继续做喜欢的事，也一直被温柔接住。";
  const markup = renderToStaticMarkup(createElement(LetterCardContent, {
    recipientName: "Mia",
    message,
    signature: "Miso",
    recipientClassName: "recipient",
    messageRegionClassName: "message-region",
    messageClassName: "message",
    signatureClassName: "signature",
  }));

  assert.match(markup, /data-letter-role="recipient"[^>]*>给 Mia</);
  assert.match(markup, new RegExp(`data-letter-role="message"[^>]*>${message}`));
  assert.match(markup, /data-letter-role="signature"[^>]*>Miso/);
  assert.equal(markup.includes("hidden"), false);
  assert.equal(markup.includes("aria-busy"), false);
});
