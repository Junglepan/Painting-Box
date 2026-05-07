# Painting-Box · Codex 协作指引

## 项目简介
Painting-Box 是一款为摄影爱好者设计的照片水印/画框生成桌面软件，技术栈为 Tauri 2 + React 18 + TypeScript。

完整方案见 `docs/PLAN.md`。

## 关键决策（勿随意改动）

| 维度 | 决策 |
|------|------|
| 技术栈 | Tauri 2 + React 18 + TS + Vite |
| UI | shadcn/ui + Tailwind + Zustand |
| 渲染 | 预览走 Canvas，导出走 Rust |
| 平台 | macOS + Windows |
| 分支 | `master` 主干 + `feat/*` 功能分支 |
| 语言 | 仅中文（首版） |

## 专职 Agent

| Agent | 用途 |
|-------|------|
| `tauri-rust-expert` | Rust 后端、Tauri 命令 |
| `image-processing-specialist` | 图像渲染、双端一致性 |
| `exif-metadata-expert` | EXIF 解析、厂商适配 |
| `react-ui-architect` | 前端架构、组件、样式 |
| `watermark-template-designer` | 水印模板视觉设计 |

遇到跨领域改动时主动调用对应 agent。

## 代码约定

- **注释**：默认不写，仅在 Why 非显而易见时写一行。绝不写"这段代码做什么"。
- **diff 最小化**：只改与任务相关的代码，不顺手重构。
- **类型严格**：TypeScript strict，禁用 `any`。Rust 禁用 `.unwrap()`。
- **样式**：仅 Tailwind utility + shadcn。不写 CSS Module / styled-components。
- **提交**：Conventional Commits（`feat:` `fix:` `docs:` `refactor:` `chore:`）

## 工作流

1. 非平凡任务：Explore → Plan → Implement → Verify
2. 前端改动完成后运行：`bun run build`（tsc + vite build）
3. 后端改动完成后运行：`cargo check && cargo clippy -- -D warnings`
4. 提交前检查 `docs/PLAN.md` / `docs/neumorphism-apple-style-guide.md` / `AGENTS.md` 是否需要同步更新
5. **用户可感知的变更必须同步追加到 `CHANGELOG.md` 的 `[Unreleased]` 段**

## 禁止事项

- 不提交 `.env` / API key / 证书
- 不 force push `master`
- 不在 Rust 侧做 UI 逻辑（排版公式统一管理）
- 不未经确认引入新的重依赖（> 5MB 编译产物）
