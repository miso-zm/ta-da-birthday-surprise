import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBirthday,
  getConfigIssue,
  getDirectionHint,
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
  assert.match(getDirectionHint("cabinet-gift"), /左下角/);
  assert.match(getDirectionHint("sofa-gift"), /中央/);
  assert.match(getDirectionHint("plant-gift"), /叶子/);
});

test("birthday formatting and runtime configuration checks are stable", () => {
  assert.equal(formatBirthday("0828"), "8 月 28 日");
  assert.equal(getConfigIssue({ kind: "birthday-password", answer: "0828" }), null);
  assert.equal(
    getConfigIssue({ kind: "birthday-password", answer: "828" }),
    "birthday-password-config-invalid",
  );
  assert.equal(
    getConfigIssue({ kind: "birthday-password", answer: "9999" }),
    "birthday-password-config-invalid",
  );
  assert.equal(
    getConfigIssue({ kind: "birthday-password", answer: "0230" }),
    "birthday-password-config-invalid",
  );
  assert.equal(
    getConfigIssue({
      kind: "find-gift",
      sceneId: "room-default",
      targetId: "bookshelf-gift",
    }),
    "find-gift-config-invalid",
  );
});
