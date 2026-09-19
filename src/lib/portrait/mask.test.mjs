import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMask, fitPortrait, foregroundBounds, normalizeMask, normalizePortrait } from "./mask.ts";

test("fit preserves ratio, caps resolution and rejects invalid dimensions", () => {
  assert.deepEqual(fitPortrait(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(fitPortrait(100, 200), { width: 100, height: 200 });
  for (const pair of [[0, 100], [100, NaN], [9999, 9999], [100.5, 300]]) assert.throws(() => fitPortrait(...pair));
});
test("NCHW preprocessing has finite output, original pixels unchanged", () => {
  const source = new Uint8ClampedArray([0, 0, 0, 255]);
  const snapshot = source.slice();
  const result = normalizePortrait(source, 1);
  assert.equal(result.length, 3);
  assert.ok(result.every(Number.isFinite));
  assert.ok(Math.abs(result[0] - (-0.485 / 0.229)) < 0.00001);
  assert.deepEqual(source, snapshot);
  assert.ok(normalizePortrait(new Uint8ClampedArray([0, 0, 0, 0]), 1)[0] > 2);
});
test("mask rejects invalid, constant and non-finite output", () => {
  assert.deepEqual([...normalizeMask(new Float32Array([0, 1, 0.5, 0.25]), 2)], [0, 255, 128, 64]);
  for (const values of [[0], [1, 1, 1, 1], [0, 1, NaN, 0], [0, 1, Infinity, 0]]) assert.throws(() => normalizeMask(new Float32Array(values), 2));
});
test("alpha multiplies existing transparency without altering skin colours", () => {
  const rgba = new Uint8ClampedArray([210, 150, 120, 128, 1, 2, 3, 0]);
  applyMask(rgba, new Uint8ClampedArray([128, 128, 128, 255, 255, 255, 255, 255]));
  assert.deepEqual([...rgba], [210, 150, 120, 64, 1, 2, 3, 0]);
  assert.throws(() => applyMask(rgba, new Uint8ClampedArray(4)));
});
test("foreground crop includes soft edge padding; blank mask fails clearly", () => {
  const data = new Uint8ClampedArray(100 * 100 * 4);
  assert.throws(() => foregroundBounds(data, 100, 100));
  for (let y = 20; y < 70; y++) for (let x = 30; x < 60; x++) data[(y * 100 + x) * 4 + 3] = 255;
  assert.deepEqual(foregroundBounds(data, 100, 100), { x: 28, y: 18, width: 34, height: 54 });
  assert.throws(() => foregroundBounds(data, 10, 10));
});
