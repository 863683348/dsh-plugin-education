import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRubric,
  lessonPlan,
  readability,
  toFlashcards,
  validateQuiz,
} from "../lib/education.js";

test("lessonPlan picks grade band and budgets minutes", () => {
  const out = lessonPlan({ topic: "Fractions", grade: "secondary", minutes: 50 });
  assert.ok(out.startsWith("# Lesson Plan: Fractions"));
  assert.ok(out.includes("Grade band: secondary"));
  const mins = [...out.matchAll(/\((\d+) min\)/g)].map((m) => Number(m[1]));
  assert.equal(mins.reduce((a, b) => a + b, 0), 50);
  assert.ok(out.includes("## Learning objectives"));
});

test("lessonPlan falls back for unknown grade", () => {
  const out = lessonPlan({ grade: "whatever", minutes: 30 });
  assert.ok(out.includes("Grade band: secondary"));
});

test("validateQuiz flags bad answer index and duplicate options", () => {
  const res = validateQuiz({
    items: [
      { stem: "Q", options: ["a", "a", "b"], answer: 5 },
    ],
  });
  assert.equal(res.valid, false);
  assert.ok(res.issues.some((i) => /duplicate/.test(i)));
  assert.ok(res.issues.some((i) => /out of range/.test(i)));
});

test("validateQuiz passes a good item", () => {
  const res = validateQuiz({
    items: [{ stem: "What is 2+2?", options: ["3", "4", "5"], answer: 1, explanation: "2+2=4" }],
  });
  assert.equal(res.valid, true);
  assert.equal(res.itemCount, 1);
});

test("buildRubric renders criteria x levels table", () => {
  const out = buildRubric({ criteria: ["Accuracy", "Clarity"], levels: 4 });
  assert.ok(out.includes("| Criteria | Level 1 | Level 2 | Level 3 | Level 4 |"));
  assert.ok(out.includes("| Accuracy |"));
  assert.ok(out.includes("| Clarity |"));
});

test("toFlashcards tsv escapes and counts", () => {
  const { text, count } = toFlashcards({ pairs: [{ q: "Q1\t", a: "A1" }, { q: "Q2", a: "A2" }], format: "tsv" });
  assert.equal(count, 2);
  assert.equal(text, "Q1\tA1\nQ2\tA2");
  assert.ok(!text.includes("\n\n"));
});

test("toFlashcards markdown", () => {
  const { text } = toFlashcards({ pairs: [{ q: "Q", a: "A" }], format: "markdown" });
  assert.ok(text.includes("Q: Q"));
  assert.ok(text.includes("A: A"));
});

test("readability English Flesch labels easy text", () => {
  const res = readability({ text: "The cat sat on the mat. It was very happy.", lang: "en" });
  assert.ok(["A1-A2", "B1"].includes(res.label));
  assert.ok(res.metrics.words >= 10);
  assert.ok(typeof res.metrics.flesch === "number");
});

test("readability CJK heuristics", () => {
  const res = readability({ text: "这是一个很长的句子，用来测试可读性。它包含多个分句。", lang: "zh" });
  assert.ok(res.metrics.sentences >= 2);
  assert.ok(["light", "moderate", "dense"].includes(res.label));
});
