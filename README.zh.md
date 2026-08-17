# dsh-plugin-education

面向 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) agent 的**教育工具包**：教案骨架、测验校验、评分量规、闪卡转换与文本难度分级。模型负责内容创作，插件负责结构与校验。

## 安装

```bash
dsh plugin --profile <profile> add dsh-plugin-education
```

重启 DSH 后，`edu_kit` 工具全局注册。

## 工具

| 动作 | 用途 |
| --- | --- |
| `lesson` | 教案骨架，按学段（小学 / 中学 / 大学 / 成人）配分钟预算 |
| `quiz` | 校验测验题 —— 题干、≥2 个不重复选项、答案索引越界、解析为空 |
| `rubric` | 分析式评分量规表（维度 × 等级） |
| `flashcard` | Q/A 对转 Anki TSV 或 markdown 卡片 |
| `level` | 可读性分级 —— 英文用 Flesch，中文用句长启发式 |

## 配置

均为可选项，写在组合行的 `config` 里：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `personaSection` | `true` | 是否注册教育提示词段 |
| `sectionOrder` | `6` | 提示词段顺序（persona 为 0，升序） |

## 设计

纯逻辑（`lib/education.js`）零 DSH/Cordis 依赖、可独立单测；`lib/index.js` 是薄 Cordis 壳。无文件系统访问，全部确定性、无副作用。

## License

MIT
