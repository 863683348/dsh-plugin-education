/**
 * dsh-plugin-education — a model-facing `edu_kit` tool and education prompt
 * guidance for DeepSeek Harness agents.
 *
 * A Cordis plugin: when the package is a profile layer (declares
 * `dsh.bundle.patch`), cordis.patch.yml inserts this row into the launcher
 * composition and the host runner loads this file. All logic is pure and
 * lives in ./education.js; this module wires it up as a model tool.
 *
 * @module dsh-plugin-education
 */
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
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
} from "./education.js";

/** Cordis plugin name (registered with the loader). */
const name = "education";

/** Services this plugin must resolve before it applies. */
const inject = ["tools", "systemPrompt"];

/** Composition-row configuration for the plugin entry. */
const Config = z.object({
  /** Register the education prompt-guidance section. */
  personaSection: z.boolean().default(true),
  /** Order of the section (ascending; persona is 0). */
  sectionOrder: z.number().default(6),
});

const SECTION_TEXT = [
  "Education guidance:",
  "- Draft lessons with `edu_kit` action `lesson` (grade-band templates with a minute budget), then adapt objectives and activities.",
  "- For quizzes, scaffold items yourself and validate the answer keys with `quiz` before delivery.",
  "- Use `rubric` for analytic grading tables, `flashcard` to convert Q/A pairs into Anki TSV or markdown.",
  "- Gauge text difficulty with `level` (Flesch for English, CJK length heuristics for Chinese) and match it to the audience.",
  "- Grade submitted work with `grade` (rubric-driven grading sheet) and plan coverage with `studyplan` (weekly schedule from a date range).",
  "- Draft assessments with `question` (type/difficulty-aware skeletons) and summarise results with `classstats` (distribution + pass rate).",
].join("\n");

function apply(ctx, config) {
  ctx.tools.register(defineTool({
    name: "edu_kit",
    description: "Education helper: `lesson` (lesson-plan skeleton by grade band: primary/secondary/tertiary/adult, with a minute budget), `quiz` (validate a quiz item set: stem, >=2 unique options, answer index in range, explanation), `rubric` (analytic rubric table from criteria), `flashcard` (convert Q/A pairs to Anki TSV or markdown), `level` (readability: Flesch for English, CJK heuristics for Chinese), `grade` (grading sheet from scored items with totals and letter grade), `studyplan` (weekly study plan from a date range), `question` (question skeletons by type/difficulty with a TSV-ready item list), `classstats` (mean/median/stdev, pass rate and score bands). Use it for teaching, tutoring, course design, or study materials.",
    parameters: {
      action: {
        type: "string", required: true,
        enum: ["lesson", "quiz", "rubric", "flashcard", "level", "grade", "studyplan", "question", "classstats"],
        description: "Which education helper to run.",
      },
      topic: { type: "string", description: "Lesson topic (lesson)." },
      subject: { type: "string", description: "Subject name (lesson)." },
      grade: { type: "string", description: "Grade band: primary | secondary | tertiary | adult (lesson)." },
      minutes: { type: "integer", description: "Lesson duration in minutes (lesson)." },
      items: {
        type: "array",
        items: { type: "object", additionalProperties: false,
          properties: {
            stem: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer: { type: "integer" },
            explanation: { type: "string" },
          },
        },
        description: "Quiz items [{stem, options[], answer, explanation}] (quiz).",
      },
      criteria: { type: "array", items: { type: "string" }, description: "Rubric criteria (rubric)." },
      levels: { type: "integer", description: "Number of rubric levels (rubric)." },
      pairs: {
        type: "array",
        items: { type: "object", additionalProperties: false, properties: { q: { type: "string" }, a: { type: "string" } } },
        description: "Q/A pairs for flashcards (flashcard).",
      },
      format: { type: "string", description: "tsv | markdown (flashcard)." },
      text: { type: "string", description: "Text to grade (level)." },
      items: { type: "array", items: { type: "object", additionalProperties: true }, description: "Graded items [{name, score, max, comment}] (grade)." },
      passPct: { type: "number", description: "Pass threshold percent (grade)." },
      start: { type: "string", description: "Plan start date YYYY-MM-DD (studyplan)." },
      end: { type: "string", description: "Plan end date YYYY-MM-DD (studyplan)." },
      hoursPerWeek: { type: "number", description: "Weekly study hours (studyplan)." },
      topics: { type: "array", items: { type: "object", additionalProperties: true }, description: "Topics [{name, hours}] (studyplan)." },
      count: { type: "integer", description: "How many questions to scaffold (question)." },
      types: { type: "array", items: { type: "string" }, description: "Question types single|multiple|fill|short (question)." },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Difficulty band (question)." },
      points: { type: "number", description: "Points per question (question)." },
      scores: { type: "array", items: { type: "number" }, description: "Student scores (classstats)." },
      full: { type: "number", description: "Full mark of the paper (classstats)." },
      bands: { type: "integer", description: "Number of score bands 2-10 (classstats)." },
      lang: { type: "string", description: "auto | en | zh (level)." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          action: { type: "string", required: true },
          text: { type: "string" },
          issues: { type: "array", items: { type: "string" } },
          valid: { type: "boolean" },
          count: { type: "integer" },
          label: { type: "string" },
          metrics: { type: "object", additionalProperties: true },
        },
      },
      render: (_args, value) => [{ type: "text", text: value.text ?? "" }],
    },
    execute: async (args) => {
      const action = args.action;
      let text = "";
      let issues;
      let valid;
      let count;
      let label;
      let metrics;
      switch (action) {
        case "lesson":
          text = lessonPlan({ topic: args.topic, subject: args.subject, grade: args.grade, minutes: args.minutes });
          break;
        case "quiz":
          ({ issues, valid, itemCount: count } = validateQuiz({ items: args.items }));
          text = valid
            ? "Quiz valid: " + count + " item(s) OK."
            : "Quiz issues found:\n- " + issues.join("\n- ");
          break;
        case "rubric":
          text = buildRubric({ criteria: args.criteria, levels: args.levels });
          break;
        case "flashcard":
          ({ text, count } = toFlashcards({ pairs: args.pairs, format: args.format }));
          break;
        case "level":
          ({ label, metrics } = readability({ text: args.text, lang: args.lang }));
          text = "Readability: " + label + " — " + JSON.stringify(metrics);
          break;
        case "grade":
          text = buildGradeSheet({ items: args.items, passPct: args.passPct }).text;
          break;
        case "studyplan":
          text = buildStudyPlan({ start: args.start, end: args.end, hoursPerWeek: args.hoursPerWeek, topics: args.topics }).text;
          break;
        case "question":
          text = buildQuestions({ topic: args.topic, count: args.count, types: args.types, difficulty: args.difficulty, points: args.points }).text;
          break;
        case "classstats":
          text = classStats({ scores: args.scores, full: args.full, passPct: args.passPct, bands: args.bands }).text;
          break;
        default:
          throw new Error("edu_kit: unknown action '" + action + "'");
      }
      return { action, text, issues, valid, count, label, metrics };
    },
    presentCall: (args) => ({
      card: "generic",
      title: "Edu kit: " + args.action,
      kind: "other",
      rawInput: args,
    }),
  }));

  if (config.personaSection) {
    ctx.effect(() => ctx.systemPrompt.section({
      name: "education:instructions",
      order: config.sectionOrder,
      text: SECTION_TEXT,
    }), "education.section()");
  }
}

export { Config, SECTION_TEXT, apply, inject, name };
