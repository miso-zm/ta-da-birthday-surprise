import test from "node:test";
import assert from "node:assert/strict";
import { stickerGeometry, dilateAlpha, insetSubjectAlpha, applyTornBottomMask } from "./sticker.ts";

test("same displayed size has same 3 CSS-pixel stroke regardless of source resolution", () => {
  assert.deepEqual(stickerGeometry(500, 600), stickerGeometry(1500, 1800));
  const g = stickerGeometry(500, 600);
  assert.equal(g.radius / g.pixelRatio, 3);
  assert.equal(g.inset / g.pixelRatio, 1);
  assert.ok(g.padding > g.radius + 3 * g.pixelRatio);
});
test("inset covers a one-pixel fringe, preserving centre RGB and source", () => {
  const rgba = new Uint8ClampedArray(9 * 9 * 4);
  for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) rgba.set([90, 130, 170, 255], (y * 9 + x) * 4);
  const before = rgba.slice();
  const result = insetSubjectAlpha(rgba, 9, 9, 1);
  assert.equal(result[(2 * 9 + 4) * 4 + 3], 0);
  assert.deepEqual([...result.slice((4 * 9 + 4) * 4, (4 * 9 + 4) * 4 + 4)], [90, 130, 170, 255]);
  assert.deepEqual(rgba, before);
});
test("inset respects transparency, soft edges and canvas boundaries", () => {
  const rgba = new Uint8ClampedArray(7 * 7 * 4);
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  rgba[(3 * 7 + 3) * 4 + 3] = 80;
  const result = insetSubjectAlpha(rgba, 7, 7, 1);
  assert.equal(result[3], 0);
  assert.equal(result[(3 * 7 + 4) * 4 + 3], 80);
  assert.equal(result[(1 * 7 + 1) * 4 + 3], 255);
  assert.ok(insetSubjectAlpha(new Uint8ClampedArray(196), 7, 7, 1).every(x => x === 0));
});
test("circular dilation preserves source pixels and excludes square corners", () => {
  const rgba = new Uint8ClampedArray(7 * 7 * 4); rgba[(3 * 7 + 3) * 4 + 3] = 180;
  const before = rgba.slice(); const mask = dilateAlpha(rgba, 7, 7, 2);
  assert.equal(mask[3 * 7 + 5], 180); assert.equal(mask[5 * 7 + 5], 0);
  assert.deepEqual(rgba, before);
});
test("blank stays transparent and edge does not wrap rows", () => {
  const rgba = new Uint8ClampedArray(5 * 5 * 4);
  assert.ok(dilateAlpha(rgba, 5, 5, 2).every(x => x === 0));
  rgba[3] = 255; const mask = dilateAlpha(rgba, 5, 5, 1);
  assert.equal(mask[1], 255); assert.equal(mask[5], 255); assert.equal(mask[4], 0);
});
test("torn mask becomes part of the subject alpha with an irregular lower contour", () => {
  const width = 48, height = 32;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y <= 28; y++) for (let x = 3; x <= 44; x++) rgba.set([90, 130, 170, 255], (y * width + x) * 4);
  const before = rgba.slice();
  const result = applyTornBottomMask(rgba, width, height, 10);
  const lastOpaque = [];
  for (let x = 3; x <= 44; x++) {
    let last = -1;
    for (let y = 0; y < height; y++) if (result[(y * width + x) * 4 + 3] > 32) last = y;
    lastOpaque.push(last);
  }
  assert.ok(Math.max(...lastOpaque) - Math.min(...lastOpaque) >= 3);
  assert.ok(lastOpaque.every(y => y < 28));
  assert.deepEqual(rgba, before);
  assert.deepEqual(applyTornBottomMask(rgba, width, height, 10), result);
});
test("rejects oversized, non-finite and mismatched dimensions", () => {
  assert.throws(() => stickerGeometry(0, 100));
  assert.throws(() => stickerGeometry(100, Infinity));
  assert.throws(() => stickerGeometry(1, 9000));
  assert.throws(() => dilateAlpha(new Uint8ClampedArray(4), 2, 2, 3));
  assert.throws(() => applyTornBottomMask(new Uint8ClampedArray(4), 2, 2, 2));
  assert.throws(() => applyTornBottomMask(new Uint8ClampedArray(16), 2, 2, 3, 0.4));
});
