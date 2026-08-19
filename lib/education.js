/**
 * dsh-plugin-education — pure education helpers: lesson plans, quiz
 * scaffolding and validation, rubrics, flashcards, readability levels.
 *
 * No DSH or Cordis imports here, so this module is unit-testable in
 * isolation. The model authors the content; these helpers give it structure
 * and deterministic checks.
 */

const LESSON_BLOCKS = {
  primary: [
    ["Warm-up", "5", "Review previous learning with a quick game or question."],
    ["Presentation", "10", "Introduce new material with examples and visuals."],
    ["Guided practice", "15", "Work through tasks together; check understanding."],
    ["Independent practice", "15", "Students apply the skill on their own."],
    ["Wrap-up & assessment", "5", "Quick exit ticket or recap."],
  ],
  secondary: [
    ["Do-now / starter", "5", "Entry task activating prior knowledge."],
    ["Direct instruction", "15", "Core content with worked examples."],
    ["Guided practice", "15", "Structured tasks with teacher feedback."],
    ["Independent / group work", "15", "Application and collaboration."],
    ["Exit ticket", "5", "Formative check of the objective."],
  ],
  tertiary: [
    ["Review & objectives", "10", "Recap previous session; state today's objectives."],
    ["Lecture / discussion", "40", "Core content with interactive questions."],
    ["Application activity", "30", "Problem set, case study, or lab."],
    ["Synthesis & wrap-up", "10", "Key takeaways, homework, next session preview."],
  ],
  adult: [
    ["Check-in & goals", "5", "Learner expectations and session goals."],
    ["Concept introduction", "20", "New concepts tied to workplace relevance."],
    ["Hands-on practice", "25", "Scenario-based tasks or role play."],
    ["Reflection & action plan", "10", "Apply to real work; set next steps."],
  ],
};

const GRADE_BAND_ORDER = ["primary", "secondary", "tertiary", "adult"];

function pickBand(grade) {
  const g = String(grade ?? "").toLowerCase();
  if (/primary|小学|elem/.test(g)) return "primary";
  if (/secondary|中|high/.test(g)) return "secondary";
  if (/tertiary|大学|college|univ/.test(g)) return "tertiary";
  if (/adult|成人|职场|prof/.test(g)) return "adult";
  return "secondary";
}

function distribute(total, parts) {
  const n = Math.max(1, Math.floor(parts));
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Lesson-plan skeleton by grade band with minute budget. */
export function lessonPlan({ topic = "", subject = "", grade = "secondary", minutes = 50 } = {}) {
  const band = pickBand(grade);
  const blocks = LESSON_BLOCKS[band];
  const total = Math.max(1, Math.floor(minutes));
  const allocs = distribute(total, blocks.length);
  const lines = [
    "# Lesson Plan" + (topic ? ": " + topic : ""),
    "",
    "- Subject: " + (subject || "(to fill)"),
    "- Grade band: " + band + " (" + grade + ")",
    "- Duration: " + total + " minutes",
    "",
    "## Learning objectives",
    "- Students will be able to ... (observable, measurable)",
    "",
    "## Materials & preparation",
    "- ...",
    "",
    "## Lesson flow",
    "",
  ];
  for (let i = 0; i < blocks.length; i++) {
    const [name, , hint] = blocks[i];
    lines.push("### " + (i + 1) + ". " + name + " (" + allocs[i] + " min)");
    lines.push("- " + hint);
    lines.push("");
  }
  lines.push("## Assessment & homework", "- ...");
  return lines.join("\n");
}

/** Validate a quiz item set; returns issues plus a corrected summary. */
export function validateQuiz({ items = [] } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return { issues: ["At least one item is required."], valid: false, itemCount: 0 };
  }
  const issues = [];
  items.forEach((item, idx) => {
    const label = "item " + (idx + 1);
    if (!item || typeof item.stem !== "string" || item.stem.trim().length === 0) issues.push(label + ": missing stem.");
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length < 2) issues.push(label + ": needs at least 2 options.");
    if (opts.length !== new Set(opts.map((o) => String(o).trim())).size) issues.push(label + ": duplicate options.");
    const answer = Number(item.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= opts.length) {
      issues.push(label + ": answer index " + item.answer + " out of range [0, " + (opts.length - 1) + "].");
    }
    if (item.explanation != null && String(item.explanation).trim().length === 0) issues.push(label + ": empty explanation.");
  });
  return { issues, valid: issues.length === 0, itemCount: items.length };
}

/** Analytic rubric as a markdown table. */
export function buildRubric({ criteria = [], levels = 4 } = {}) {
  const cs = Array.isArray(criteria) ? criteria.filter((c) => String(c).trim().length > 0) : [];
  const n = Math.max(2, Math.floor(levels));
  if (cs.length === 0) {
    return "# Rubric\n\n(no criteria provided — add criteria as a list, e.g. [\"Accuracy\", \"Clarity\"])";
  }
  const lines = ["# Analytic Rubric", ""];
  lines.push("| Criteria | " + Array.from({ length: n }, (_, i) => "Level " + (i + 1)).join(" | ") + " |");
  lines.push("| --- | " + Array.from({ length: n }, () => "---").join(" | ") + " |");
  for (const c of cs) {
    lines.push("| " + c + " | " + Array.from({ length: n }, () => "Descriptor (" + c + ")").join(" | ") + " |");
  }
  return lines.join("\n");
}

function escapeTsv(v) {
  return String(v).replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "").trim();
}

/** Convert Q/A pairs to Anki TSV or markdown cards. */
export function toFlashcards({ pairs = [], format = "tsv" } = {}) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return { text: "(no pairs provided — use [{q: ..., a: ...}])", count: 0 };
  }
  const rows = pairs.map((p) => {
    const q = p && typeof p.q === "string" ? p.q : "";
    const a = p && typeof p.a === "string" ? p.a : "";
    return { q, a };
  });
  if (format === "markdown") {
    return { text: rows.map((r) => "Q: " + r.q + "\nA: " + r.a).join("\n\n"), count: rows.length };
  }
  return { text: rows.map((r) => escapeTsv(r.q) + "\t" + escapeTsv(r.a)).join("\n"), count: rows.length };
}

function countSyllables(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  const groups = w.match(/[aeiouy]+/g) || [];
  let n = groups.length;
  if (w.endsWith("e") && n > 1) n -= 1;
  if (w.endsWith("le") && n === 1) n += 1;
  return Math.max(1, n);
}

/** Readability estimate: Flesch reading ease (en) or CJK length heuristics. */
export function readability({ text = "", lang = "auto" } = {}) {
  const t = String(text);
  if (t.trim().length === 0) return { label: "empty", metrics: {} };
  const cjk = /[\u4e00-\u9fff\u3000-\u303f]/.test(t) && !/[a-zA-Z]{4,}/.test(t) || (lang === "zh");
  if (cjk) {
    const sentences = t.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
    const chars = t.replace(/\s/g, "").replace(/[。！？，、；：""''（）《》.?!,;:()]/g, "").length;
    const avg = sentences.length > 0 ? chars / sentences.length : 0;
    const longSentences = sentences.filter((s) => s.length > 60).length;
    const label = avg > 40 ? "dense" : avg > 20 ? "moderate" : "light";
    return { label, metrics: { sentences: sentences.length, chars, avgCharsPerSentence: Number(avg.toFixed(1)), longSentences } };
  }
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = t.split(/\s+/).filter((w) => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return { label: "empty", metrics: {} };
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  const label = score > 80 ? "A1-A2" : score > 60 ? "B1" : score > 40 ? "B2" : score > 30 ? "C1" : "C2";
  return {
    label,
    metrics: {
      sentences: sentences.length,
      words: words.length,
      syllables,
      flesch: Number(score.toFixed(1)),
      avgWordsPerSentence: Number((words.length / sentences.length).toFixed(1)),
    },
  };
}

/** Letter grade from a percentage (common scale). */
export function letterGrade(pct) {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

/** Build a grading sheet from scored items. */
export function buildGradeSheet({ items = [], passPct = 60 } = {}) {
  const list = Array.isArray(items) ? items.filter((x) => x) : [];
  if (list.length === 0) throw new Error("education: at least one graded item is required");
  const rows = list.map((it, i) => {
    const score = Number(it.score);
    const max = Number(it.max);
    if (!Number.isFinite(score) || score < 0) throw new Error("education: score must be a non-negative number");
    if (!Number.isFinite(max) || max <= 0) throw new Error("education: max must be a positive number");
    return {
      no: i + 1,
      name: it.name || "Item " + (i + 1),
      score: Number(score.toFixed(2)),
      max: Number(max.toFixed(2)),
      pct: Number(((score / max) * 100).toFixed(1)),
      comment: it.comment || "",
    };
  });
  const totalScore = rows.reduce((s, r) => s + r.score, 0);
  const totalMax = rows.reduce((s, r) => s + r.max, 0);
  const totalPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  const grade = letterGrade(totalPct);
  const pass = totalPct >= Number(passPct || 0);
  const text = [
    "# Grading sheet",
    "",
    "| # | Item | Score | Max | % | Comment |",
    "|---|------|-------|-----|---|---------|",
    ...rows.map((r) => "| " + r.no + " | " + r.name + " | " + r.score + " | " + r.max + " | " + r.pct + "% | " + r.comment + " |"),
    "| **Total** | | **" + totalScore + "** | " + totalMax + " | " + totalPct.toFixed(1) + "% | " + grade + " |",
    "",
    "Result: " + (pass ? "PASS" : "FAIL") + " (" + totalPct.toFixed(1) + "%, grade " + grade + ")",
  ].join("\n");
  return { rows, totalScore: Number(totalScore.toFixed(2)), totalMax, totalPct: Number(totalPct.toFixed(1)), grade, pass, text };
}

function fmtDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Build a weekly study plan from topics and a date range. */
export function buildStudyPlan({ start = "", end = "", hoursPerWeek = 10, topics = [] } = {}) {
  const from = new Date(start + "T00:00:00");
  const to = new Date(end + "T00:00:00");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error("education: start and end dates are required (YYYY-MM-DD)");
  if (to < from) throw new Error("education: end must not be before start");
  const totalDays = Math.round((to - from) / 86400000) + 1;
  const weeks = Math.max(1, Math.ceil(totalDays / 7));
  const list = (Array.isArray(topics) ? topics : []).filter((t) => t && t.name);
  if (list.length === 0) throw new Error("education: at least one topic is required");
  const hpw = Math.max(0, Number(hoursPerWeek) || 0);
  const remaining = list.map((t) => ({ name: t.name, hours: Math.max(0, Number(t.hours) || 0) }));
  const totalHours = remaining.reduce((s, t) => s + t.hours, 0);
  const weeksNeeded = hpw > 0 ? Math.max(1, Math.ceil(totalHours / hpw)) : weeks;
  const planWeeks = Math.min(weeks, weeksNeeded);
  const rows = [];
  let ti = 0;
  for (let w = 1; w <= planWeeks; w++) {
    const ws = new Date(from.getTime() + (w - 1) * 7 * 86400000);
    const we = new Date(Math.min(ws.getTime() + 6 * 86400000, to.getTime()));
    const items = [];
    let budget = hpw;
    while (budget > 0 && ti < remaining.length) {
      const t = remaining[ti];
      if (t.hours <= 0) { ti++; continue; }
      const take = Math.min(t.hours, budget);
      items.push({ name: t.name, hours: take });
      t.hours -= take;
      budget -= take;
    }
    rows.push({ week: w, range: fmtDate(ws) + " ~ " + fmtDate(we), items, hours: items.reduce((s, x) => s + x.hours, 0) });
    if (ti >= remaining.length) break;
  }
  const text = [
    "# Study plan",
    "",
    "Period: " + fmtDate(from) + " ~ " + fmtDate(to) + " (" + planWeeks + " week(s), " + hpw + "h/week)",
    "",
    "| Week | Date range | Topic(s) | Hours |",
    "|------|-----------|----------|-------|",
    ...rows.map((r) => "| " + r.week + " | " + r.range + " | " + (r.items.map((x) => x.name + " (" + x.hours + "h)").join(", ") || "-") + " | " + r.hours + " |"),
  ].join("\n");
  return { weeks: planWeeks, rows, totalHours, text };
}