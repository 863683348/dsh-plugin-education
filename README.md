# dsh-plugin-education

An **education toolkit** for [DeepSeek Harness](https://github.com/deepseek-ai/dsh) agents: lesson-plan skeletons, quiz validation, rubrics, flashcards, and readability levels. The model authors the content; the plugin supplies structure and checks.

## Install

```bash
dsh plugin --profile <profile> add dsh-plugin-education
```

Restart DSH. The `edu_kit` tool is registered host-wide.

## Tool

| action | purpose |
| --- | --- |
| `lesson` | Lesson-plan skeleton by grade band (primary / secondary / tertiary / adult) with a minute budget |
| `quiz` | Validate quiz items — stem, ≥2 unique options, answer index in range, explanation |
| `rubric` | Analytic rubric table from criteria × levels |
| `flashcard` | Convert Q/A pairs to Anki TSV or markdown |
| `level` | Readability — Flesch for English, CJK length heuristics for Chinese |

## Config

All optional, on the composition row's `config`:

| key | default | meaning |
| --- | --- | --- |
| `personaSection` | `true` | register the education prompt-guidance section |
| `sectionOrder` | `6` | prompt section order (persona is 0, ascending) |

## Design

Pure logic (`lib/education.js`) has zero DSH/Cordis imports and is unit-tested in isolation; `lib/index.js` is the thin Cordis plugin wiring the tool and the prompt section. No filesystem access — deterministic and side-effect free.

## License

MIT
