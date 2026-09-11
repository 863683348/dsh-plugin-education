import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGradeSheet,
  buildQuestions,
  buildRubric,
  buildStudyPlan,
  classStats,
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


test("buildGradeSheet computes totals and letter grade", () => {
  const sheet = buildGradeSheet({
    items: [
      { name: "Q1", score: 8, max: 10, comment: "good" },
      { name: "Q2", score: 5, max: 10 },
      { name: "Essay", score: 30, max: 40 },
    ],
  });
  assert.equal(sheet.totalScore, 43);
  assert.equal(sheet.totalMax, 60);
  assert.ok(sheet.totalPct > 70);
  assert.equal(sheet.grade, "C");
  assert.equal(sheet.pass, true);
  assert.ok(sheet.text.includes("| **Total** | | **43** | 60 |"));
});

test("buildGradeSheet fails below pass threshold", () => {
  const sheet = buildGradeSheet({ items: [{ name: "Q1", score: 1, max: 10 }], passPct: 60 });
  assert.equal(sheet.pass, false);
  assert.equal(sheet.grade, "F");
  assert.ok(sheet.text.includes("FAIL"));
});

test("buildGradeSheet rejects bad input", () => {
  assert.throws(() => buildGradeSheet({ items: [] }));
  assert.throws(() => buildGradeSheet({ items: [{ name: "x", score: -1, max: 10 }] }));
  assert.throws(() => buildGradeSheet({ items: [{ name: "x", score: 1, max: 0 }] }));
});

test("buildStudyPlan builds weekly rows within the date range", () => {
  const plan = buildStudyPlan({
    start: "2026-09-01", end: "2026-09-21", hoursPerWeek: 10,
    topics: [{ name: "Algebra", hours: 12 }, { name: "Geometry", hours: 12 }],
  });
  assert.ok(plan.weeks >= 3, "at least 3 weeks");
  assert.ok(plan.rows.length <= 3);
  assert.equal(plan.totalHours, 24);
  assert.ok(plan.text.startsWith("# Study plan"));
  const hoursSum = plan.rows.reduce((s, r) => s + r.hours, 0);
  assert.equal(hoursSum, 24);
});

test("buildStudyPlan handles zero-hour topics without looping", () => {
  const plan = buildStudyPlan({
    start: "2026-09-01", end: "2026-09-07", hoursPerWeek: 5,
    topics: [{ name: "Optional", hours: 0 }],
  });
  assert.ok(plan.rows.length >= 1);
  assert.equal(plan.totalHours, 0);
});

test("buildStudyPlan rejects bad dates and empty topics", () => {
  assert.throws(() => buildStudyPlan({ start: "2026-01-01", end: "2025-01-01", topics: [{ name: "x", hours: 1 }] }));
  assert.throws(() => buildStudyPlan({ start: "bad", end: "2026-01-01", topics: [{ name: "x", hours: 1 }] }));
  assert.throws(() => buildStudyPlan({ start: "2026-01-01", end: "2026-01-08", topics: [] }));
});


test("buildQuestions scaffolds items across requested types", () => {
  const q = buildQuestions({ topic: "分数", count: 4, types: ["single", "fill"], difficulty: "easy" });
  assert.equal(q.count, 4);
  assert.equal(q.items[0].type, "single");
  assert.equal(q.items[1].type, "fill");
  assert.ok(q.items[0].stem.includes("分数"));
  assert.equal(q.items[0].level, "识记/理解");
  assert.ok(q.text.startsWith("# 试题骨架"));
});

test("buildQuestions validates topic, types and difficulty", () => {
  assert.throws(() => buildQuestions({ topic: "" }));
  assert.throws(() => buildQuestions({ topic: "x", types: ["bogus"] }));
  assert.throws(() => buildQuestions({ topic: "x", difficulty: "impossible" }));
});

test("buildQuestions caps count", () => {
  const q = buildQuestions({ topic: "x", count: 999 });
  assert.ok(q.count <= 50);
});

test("classStats computes mean, median and pass rate", () => {
  const s = classStats({ scores: [95, 88, 72, 60, 45, 30], full: 100, passPct: 60 });
  assert.equal(s.n, 6);
  assert.equal(s.mean, 65);
  assert.equal(s.median, 66);
  assert.equal(s.max, 95);
  assert.equal(s.min, 30);
  assert.equal(s.passLine, 60);
  assert.equal(s.passRate, 66.7);
  assert.ok(s.stdev > 0);
});

test("classStats builds score bands covering all students", () => {
  const s = classStats({ scores: [100, 80, 60, 40, 20, 0], full: 100, bands: 5 });
  assert.equal(s.distribution.length, 5);
  const total = s.distribution.reduce((a, b) => a + b.count, 0);
  assert.equal(total, 6, "all students counted");
});

test("classStats rejects empty or invalid input", () => {
  assert.throws(() => classStats({ scores: [] }));
  assert.throws(() => classStats({ scores: ["a", "b"] }));
  assert.throws(() => classStats({ scores: [1], full: 0 }));
});
