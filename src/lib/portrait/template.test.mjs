import test from "node:test";
import assert from "node:assert/strict";
import { balloonTemplate, blueTemplate, clampPlacement, placementRect, PORTRAIT_TEMPLATE_SIZE } from "./template.ts";

test("balloon template keeps fixed layers inside the artwork safety area", () => {
  assert.equal(PORTRAIT_TEMPLATE_SIZE, 720);
  for (const layer of [balloonTemplate.background, ...balloonTemplate.foreground]) {
    assert.match(layer.src, /^\/assets\/portrait\/balloon\/.+-v1\.png$/);
    assert.ok(layer.centerX >= 0.15 && layer.centerX <= 0.85);
    assert.ok(layer.centerY >= 0.05 && layer.centerY <= 0.82);
    assert.ok(layer.width > 0 && layer.width <= 1);
  }
});

test("balloon template does not depend on an auto-positioned hat", () => {
  assert.equal("hat" in balloonTemplate, false);
});

test("template does not use a detached torn-paper strip", () => {
  for (const template of [balloonTemplate, blueTemplate]) {
    assert.equal("tornEdge" in template, false);
    assert.equal("portraitClipBottom" in template, false);
  }
});

test("blue template uses fixed blue collage layers and the shared portrait placement", () => {
  assert.equal(blueTemplate.id, "blue");
  assert.equal(blueTemplate.background.src, "/assets/portrait/blue/background-v1.png");
  assert.deepEqual(blueTemplate.portrait, balloonTemplate.portrait);
  assert.deepEqual(blueTemplate.foreground.map(layer => layer.src), [
    "/assets/portrait/blue/confetti-v1.png",
    "/assets/portrait/blue/sparkles-v1.png",
    "/assets/portrait/blue/gift-v1.png",
    "/assets/portrait/blue/star-v1.png",
    "/assets/portrait/blue/cake-v1.png",
  ]);
  for (const layer of [blueTemplate.background, ...blueTemplate.foreground]) {
    assert.ok(layer.centerX >= 0.15 && layer.centerX <= 0.85);
    assert.ok(layer.centerY >= 0.05 && layer.centerY <= 0.82);
    assert.ok(layer.width > 0 && layer.width <= 1);
  }
});

test("portrait transforms are finite and constrained for mobile editing", () => {
  assert.deepEqual(clampPlacement({ centerX: -2, centerY: 9, width: 4, rotation: -3 }), {
    centerX: 0.18,
    centerY: 0.82,
    width: 0.76,
    rotation: -0.18,
  });
  assert.throws(() => clampPlacement({ centerX: Number.NaN, centerY: 0.5, width: 0.5, rotation: 0 }));
});

test("placement preserves source ratio and centers correctly", () => {
  const rect = placementRect(400, 800, { centerX: 0.5, centerY: 0.5, width: 0.5, rotation: 0 });
  assert.deepEqual(rect, { x: 180, y: 0, width: 360, height: 720, rotation: 0 });
});
