# dsh-plugin-education 路线图（Roadmap）

> 基线：**v0.1.0**（已发布 npm / 已挂 vertical-toolkits profile）
> 范围：接下来 5 个版本 **v0.2.0 → v0.6.0**
> 规划原则：每个 minor 版本交付 1–2 个可独立验证的新动作；保持纯逻辑模块可单测、无副作用。

## 版本总览

| 版本 | 主题 | 关键交付 |
|---|---|---|
| v0.2.0 | 批改与计划 | `grade` 作业批改评分卡 + `studyplan` 学习计划生成 |
| v0.3.0 | 命题与学情 | `question` 试题生成脚手架 + `classstats` 班级成绩统计 |
| v0.4.0 | 分层与活动 | `lesson_variant` 教案多版本（分层/多语言）+ `activity` 课堂活动建议 |
| v0.5.0 | 对齐与报告 | `standards` 课程标准对齐 + `report` 学情评估报告 |
| v0.6.0 | 出卷与路径 | `paper` 试卷组装（难度/知识点均衡）+ `path` 个性化学习路径 |

## v0.2.0（下一个版本）— 批改与计划

### 新增动作
- `grade`：作业批改评分卡——
  - 输入题目列表 + 参考答案/评分要点 + 学生作答 → 按 rubric 维度生成批改表（得分、评语、总分）
  - 支持数值/等级两种计分
- `studyplan`：学习计划生成——
  - 输入起止日期、可用课时、科目/章节清单 → 输出周计划表（Markdown 表格）
  - 可配每日/每周时长上限

### 实现位置
- `lib/education.js`：新增 `buildGradeSheet` / `buildStudyPlan` 纯函数
- `lib/index.js`：注册 2 个新 action 到 `edu_kit` 工具

### 验收标准
- [ ] `node --check` 通过
- [ ] 新增单测 ≥ 6 个（维度计分、等级换算、日期分配、边界）
- [ ] 原有 5 个 action 单测全绿
- [ ] README（en/zh）更新
- [ ] vertical-toolkits dump-config 正常

## v0.3.0 ✅ 已完成 — 命题与学情

- `question`：按知识点 + 难度生成题干/选项/答案骨架（单选/多选/填空/简答），可导出题库 TSV
- `classstats`：班级成绩统计（均值、中位数、分布、及格率、分数段柱状数据）

## v0.4.0 — 分层与活动

- `lesson_variant`：同一教案按学力（基础/标准/进阶）或语言（中/英）生成变体
- `activity`：按学科 × 年级推荐课堂活动（活动名、时长、材料、组织方式）

## v0.5.0 — 对齐与报告

- `standards`：知识点 ↔ 课程标准条目对齐检查（覆盖度、缺口清单）
- `report`：综合学情评估报告（成绩 + 掌握度 + 建议），Markdown 导出

## v0.6.0 — 出卷与路径

- `paper`：从题库组装试卷（题型配比、难度分布、知识点覆盖均衡、总分校验）
- `path`：基于掌握度生成个性化学习路径（薄弱点优先、里程碑）

## 发布节奏

每个版本完成后走完整 dsh-factory 流程：本地验证 → npm publish → GitHub topic → awesome PR。
