# Changelog

记录 Painting-Box 的可观察变化。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 SemVer（0.x 阶段小改为 minor，微调为 patch）。

## [Unreleased]

### 功能
- **批量导出按钮**（UI 框架）：`PhotoList` 头部加入主色 Download 按钮，点击弹出设置 popover（格式 JPG/PNG/WebP、质量 60-100、输出目录、开始导出）；无照片时禁用。导出动作占位，待 Rust 后端接入。
- **移除 `AppHeader` 导出按钮**：导出职责下沉到照片列表工具栏，header 只保留"设置"。

### UI / 风格
- **新增 `ResizeHandle` 可拖拽分隔条**：照片列表与预览之间替换静态 `divider-v` 为拖拽条（4px 命中区 + hover 主色高亮 + 全局 `cursor: col-resize`）；中心带三点药丸拖拽把手（neu-raised 底 + hover 抬升换主色），暗示可拖拽；列表宽度 clamp 200-400px，持久化到 `localStorage`（key `painting-box-layout`），默认 240px。
- **风格文档升级至 v1.3**：废弃 `.label-raised`（浮块过于抢戏），改为三层标签体系（分组标题 `.label-inset` → 子类标题 `.label-plain` → Slider hint）。
- **Chip 统一长款药丸形**：`h-[22px] min-w-[36px] rounded-full px-2.5`，去除 `.chip-icon` 方形变体；联动锁等单图标开关一并统一。
- **Num-input 单位外置**：`%` `px` 等从输入框内 overlay 改为并排独立 `<span>`（`gap-1`，10px muted/70），避免视觉干扰输入区。
- **数值样式统一**：全项 `tabular-nums`；计数徽标一律 `text-[10px] text-muted-foreground/70`。
- **预设/照片列表空态极简化**：移除装饰图标与引导文案，只保留必要按钮（如"保存当前参数"）。
- 参数面板字体 Section 顺序调整：字重 → 字号 → 字距 → 行高 → 颜色 → 对齐。
- `.surface-inset` 启用 `backdrop-filter: blur(24px) saturate(1.4)`，下凹内容区呈"玻璃槽"质感；工具区保持扁平。

### 架构
- 新增 `src/stores/preset-store.ts`：zustand `persist` 中间件，localStorage 持久化预设（key `painting-box-presets`）。
- 新增 `src/lib/templates.ts` + `TEMPLATE_LIBRARY`：11 套模板枚举（classic-bottom / polaroid / minimal-corner / magazine / film-strip / full-frame / leica / poster / square-social / xpan / minimal-blank）。
- 新增 `src/components/gallery/template-gallery.tsx` / `preset-gallery.tsx`：底部双横向滚动画廊（flex `3:2`），支持 inline 命名、双击重命名、选中删除。
- 参数面板扩展 `FrameParams` 至 30+ 字段，新增 8 个可折叠 Section：布局 / 背景 / 阴影 / 照片 / 文字 / Logo / 分隔线 / 显示项。
- 三栏骨架：`FrameParamsPanel (w-72) | PreviewPane (flex-1) | PhotoList (w-52)`，栏间 `.divider-v` 分隔。

---

## 使用约定

- **何时追加条目**：任一用户可感知的变更（UI、交互、数据结构、持久化、快捷键）。纯内部重构、格式化不记录。
- **分类**：`UI / 风格`、`架构`、`功能`、`修复`、`性能`、`文档`。按需裁剪。
- **格式**：用命令式现在时 + 结果（做了什么 / 为什么值得知道），而不是提交日志的流水账。
- **发版**：`master` 切 `v0.x.0` tag 时，把 `[Unreleased]` 改为版本号 + 日期，并在上面新开 `[Unreleased]` 块。
