import assert from "node:assert/strict";
import test from "node:test";

import {
  getImageFailureKey,
  getPhotoTransformStyle,
  normalizeScrapbookTransform,
} from "./scrapbook-logic.ts";

test("uses the same normalized offset and scale formula as Sender", () => {
  assert.deepEqual(
    getPhotoTransformStyle({ x: 1, y: -0.5, scale: 2 }),
    { transform: "translate(25%, -12.5%) scale(2)" },
  );
  assert.deepEqual(
    getPhotoTransformStyle({ x: 0.4, y: 0.75, scale: 1 }),
    { transform: "translate(0%, 0%) scale(1)" },
  );
});

test("guards malformed restored transforms without changing valid transforms", () => {
  assert.deepEqual(
    normalizeScrapbookTransform({ x: 0.4, y: -0.6, scale: 1.75 }),
    { x: 0.4, y: -0.6, scale: 1.75 },
  );
  assert.deepEqual(
    normalizeScrapbookTransform({ x: 4, y: -3, scale: 9 }),
    { x: 1, y: -1, scale: 2.5 },
  );
});

test("keys image failures by slot and URL so replacement photos recover", () => {
  const original = getImageFailureKey({
    id: "memory-1",
    imageUrl: "data:image/jpeg;base64,old",
    transform: { x: 0, y: 0, scale: 1 },
  });
  const replacement = getImageFailureKey({
    id: "memory-1",
    imageUrl: "data:image/jpeg;base64,new",
    transform: { x: 0, y: 0, scale: 1 },
  });

  assert.notEqual(original, replacement);
});
