import test from "node:test";
import assert from "node:assert/strict";
import {
  countVisibleCharacters,
  getMessageDensity,
  needsCompactName,
  resolveCardTemplate,
} from "./birthday-card-logic.ts";

test("known card templates are dispatched and unknown ids fall back to the envelope letter", () => {
  assert.equal(resolveCardTemplate("coral-birthday"), "coral-birthday");
  assert.equal(resolveCardTemplate("cream-wishes"), "cream-wishes");
  assert.equal(resolveCardTemplate("future-template"), "coral-birthday");
});

test("message density keeps the 10–45 character letter layout in its approved short range", () => {
  assert.equal(getMessageDensity("祝你生日快乐呀"), "short");
  assert.equal(getMessageDensity("愿新的一岁里，你依然能做喜欢的事，见想见的人；也愿每个认真奔赴的日子，都被好好地温柔回应。"), "short");
  assert.equal(getMessageDensity("a".repeat(46)), "medium");
  assert.equal(getMessageDensity("a".repeat(96)), "long");
  assert.equal(getMessageDensity("a".repeat(151)), "maximum");
});

test("whitespace does not make a message or name look longer than it is", () => {
  assert.equal(countVisibleCharacters("给 Mia\n"), 4);
  assert.equal(needsCompactName("林书妍小朋友"), false);
  assert.equal(needsCompactName("全世界最勇敢的林书妍小朋友"), true);
});
