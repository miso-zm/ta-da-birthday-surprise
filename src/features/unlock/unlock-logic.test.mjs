import test from "node:test";
import assert from "node:assert/strict";
import {
  BLOW_CANDLES_COMPLETION_MS,
  getBlowProgress,
  getConfigIssue,
  getExtinguishedCandleCount,
  getFindGiftWrongFeedback,
  getLastExtinguishedThreshold,
  getDirectionHint,
  isMicrophoneRequestActive,
  getRpsRound,
} from "./unlock-logic.ts";

test("the third rock-paper-scissors round always wins", () => {
  assert.deepEqual(getRpsRound("rock", 3, () => 0), {
    opponent: "scissors",
    outcome: "win",
  });
  assert.deepEqual(getRpsRound("paper", 3, () => 0), {
    opponent: "rock",
    outcome: "win",
  });
  assert.deepEqual(getRpsRound("scissors", 3, () => 0), {
    opponent: "paper",
    outcome: "win",
  });
});

test("earlier rounds report win, draw, and loss explicitly", () => {
  assert.equal(getRpsRound("rock", 1, () => 0).outcome, "draw");
  assert.equal(getRpsRound("rock", 1, () => 0.4).outcome, "lose");
  assert.equal(getRpsRound("rock", 1, () => 0.9).outcome, "win");
});

test("each gift target has a directional text hint", () => {
  assert.match(getDirectionHint("rug-box"), /左下方/);
  assert.match(getDirectionHint("sofa-box"), /中央/);
  assert.match(getDirectionHint("plant-box"), /右侧/);
});

test("find gift only gives a direction after the third wrong guess", () => {
  const first = getFindGiftWrongFeedback("rug-box", 1, "沙发这只");
  assert.equal(first.showsDirectionHint, false);
  assert.match(first.title, /不是沙发这只/);

  const third = getFindGiftWrongFeedback("rug-box", 3, "花盆这只");
  assert.equal(third.showsDirectionHint, true);
  assert.match(third.message, /左下方/);
  assert.doesNotMatch(third.message, /粉礼盒|地毯上的/);
});

test("blow candles needs no sender configuration", () => {
  assert.equal(getConfigIssue({ kind: "blow-candles" }), null);
});

test("a microphone request stops being active when its owner leaves or uses fallback", () => {
  const activeRequest = {
    requestId: 2,
    activeRequestId: 2,
    mounted: true,
    completed: false,
    fallbackActive: false,
  };

  assert.equal(isMicrophoneRequestActive(activeRequest), true);
  assert.equal(isMicrophoneRequestActive({ ...activeRequest, mounted: false }), false);
  assert.equal(isMicrophoneRequestActive({ ...activeRequest, activeRequestId: 3 }), false);
  assert.equal(isMicrophoneRequestActive({ ...activeRequest, completed: true }), false);
  assert.equal(isMicrophoneRequestActive({ ...activeRequest, fallbackActive: true }), false);
});

test("three candles extinguish in order and never exceed the scene count", () => {
  assert.equal(getExtinguishedCandleCount(0), 0);
  assert.equal(getExtinguishedCandleCount(349), 0);
  assert.equal(getExtinguishedCandleCount(350), 1);
  assert.equal(getExtinguishedCandleCount(699), 1);
  assert.equal(getExtinguishedCandleCount(700), 2);
  assert.equal(getExtinguishedCandleCount(1049), 2);
  assert.equal(getExtinguishedCandleCount(BLOW_CANDLES_COMPLETION_MS), 3);
  assert.equal(getExtinguishedCandleCount(5000), 3);
});

test("released blowing keeps completed candles out but drops partial progress", () => {
  assert.equal(getLastExtinguishedThreshold(349), 0);
  assert.equal(getLastExtinguishedThreshold(699), 350);
  assert.equal(getLastExtinguishedThreshold(1049), 700);
  assert.equal(getLastExtinguishedThreshold(5000), BLOW_CANDLES_COMPLETION_MS);
  assert.equal(getBlowProgress(0), 0);
  assert.equal(getBlowProgress(BLOW_CANDLES_COMPLETION_MS), 100);
  assert.equal(getBlowProgress(Number.NaN), 0);
});

test("invalid gift locations still enter controlled fallback", () => {
  assert.equal(
    getConfigIssue({
      kind: "find-gift",
      sceneId: "room-default",
      targetId: "bookshelf-gift",
    }),
    "find-gift-config-invalid",
  );
});
