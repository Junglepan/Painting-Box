# Painting-Box · TODO 与方案规划

> 本文档汇总 `claude/expand-painting-box-features-lr0o3` 分支当前阶段的遗留工作，按优先级排序，每项配有可执行方案。完成后应同步删除或迁移到 PLAN.md / CHANGELOG.md。

最近一次盘点：2026-04-29，对应分支 commit `83ddace`。

---

## P0 · 文档与可观察性

### 1. 补齐 CHANGELOG.md `[Unreleased]` 段

**现状**：本轮拆分 `classic_bottom.rs` + 12 款模板新增 Rust 渲染器 + 7 款模板预览/导出对齐修复均未追加到 CHANGELOG。CLAUDE.md 明确规定"用户可感知的变更必须同步追加到 `[Unreleased]` 段"。

**方案**：在 `CHANGELOG.md` 的 `[Unreleased]` 段新增三条：
- `### 修复` 下添加："**12 款模板导出端从 fallback 升级为原生 Rust 渲染器**：cinematic / film-strip / xiaomi-leica / swiss-grid / date-stamp / fujifilm-classic / hasselblad / photo-album / darkroom-proof / kodak-slide / crop-marks / contact-sheet 全部具备独立 Rust 实现，导出与预览的几何/排版差异从"明显错位"降为"基线/字距 < 1px 偏差"。"
- `### 修复` 下添加："**7 款模板预览/导出基线对齐修复**：将 TS Canvas alphabetic baseline 显式转换为 Rust top-y（`y = baseline - ascent`）；修正 Hasselblad 字号双重 rs 缩放；Cinematic 自定义文字行归位；Film Strip 顶栏补全 frame number；Kodak Slide 补 1px 幻灯片光圈黑边；Swiss Grid 标题字重补 bold。"
- `### 重构` 下添加："**渲染器拆分**：`classic_bottom.rs` 从 1700+ 行拆分为 `compose.rs`（dispatch）+ `templates/<name>.rs`（每模板独立文件）；`fill_rect` / `fill_rounded_rect_solid` / `compute_canvas_size` / `fit_photo_in_area` / `build_params_line` 等共享 helper 留在 `classic_bottom.rs` 并标记 `pub(crate)`，便于新模板复用。"

**已知限制**：在 `### 已知限制` 段同步增补当前的引擎限制（详见 P2-1 / P2-2 / P2-3）。

**工作量**：10 分钟。

---

### 2. 把 P2 引擎限制写入"已知限制"

**现状**：四类已知差异（shadow blur / 旋转 / italic / 等宽字体）只在本 TODO 文档里提到，对外用户与未来读者无感知。

**方案**：在 CHANGELOG `[Unreleased] / ### 已知限制` 段新增："**部分模板预览与导出存在视觉细节差异（无法仅靠几何对齐解决）**：Date Stamp / Photo Album 的阴影模糊（`ctx.shadowBlur`）在导出端未实现，体现为"硬阴影"；Darkroom Proof 的 `PROOF` 红章在导出端为直立绘制（TS 旋转 -8°）；Photo Album 题注在导出端非斜体；Date Stamp / Contact Sheet / Crop Marks 在 TS 强制 Courier/Menlo 等宽字体，导出端使用用户全局字体。这些差异需要引入新依赖才能解决（见 docs/TODO.md P2 段）。"

**工作量**：5 分钟。

---

## P1 · 工程债务

### 3. 清理 11 条历史 Clippy 告警

**现状**：`cargo clippy -- -D warnings` 当前抛 11 条 error，全部为本次重构前已有的告警，但项目工作流要求 clippy 干净。

**告警来源清单**（按文件归类）：
1. `src/images/mod.rs:5` — `unused import: process::Command`
2. `src/images/mod.rs:98` — `function temp_png_path is never used`
3. `src/render/text.rs` — 4 条 `unexpected cfg condition name`（`bundled_playfair_display` / `bundled_bebas_neue` / `bundled_noto_sans_sc`，每个出现 2 次）
4. 2 条 `this function has too many arguments (8/7)`（位置待定位 — 可能在 `compose.rs::compose` 与 `templates/classic_bottom.rs::compose_with_plan`）

**方案**：
- **`process::Command` 与 `temp_png_path`**：先确认是否仍有计划用途，若无直接删除；若是 dev-only，加 `#[allow(dead_code)]` 并注释保留原因。
- **`unexpected cfg condition name`**：在 `src-tauri/build.rs` 顶部加 `println!("cargo::rustc-check-cfg=cfg(bundled_playfair_display)");` 等四条声明（名称已在 `--help` 提示中给出），让编译器知道这些 cfg 是有意定义的。
- **too many arguments**：两个函数都是 dispatch / compose 入口，参数精简会大动手术。直接在函数前加 `#[allow(clippy::too_many_arguments)]`，并在注释里说明原因（"top-level dispatch entry, splitting would obscure call sites"）。

**工作量**：30 分钟。

**风险**：若 `temp_png_path` 是 Windows-only 路径辅助，删除前需确认其它平台代码是否引用。

---

### 4. 视觉回归 fixture（导出端）

**现状**：12 款模板的 Rust 渲染器只通过"对照 TS 源代码逐字段 review"保证一致，无 baseline 截图比对。一旦未来改动 `classic_bottom.rs` 的共享 helper（如 `fit_photo_in_area`），不会有自动化告警。

**方案**：
- 在 `src-tauri/tests/` 下新增 `template_render_fixture.rs`，使用现有 `tests/fixtures/preview-default.jpg`（或新增一张 900×600 测试图）。
- 对每款模板调用 `compose()` 生成 PNG，与 `tests/fixtures/expected/<template>.png` 做像素 hash（`blake3` / `sha256`）比对。
- 首次运行时生成 baseline；CI 上断言 hash 匹配。
- 用 `cargo test --features=fixture-update` 时允许覆盖 baseline。

**工作量**：3-4 小时（含 baseline 生成 + 13 款模板覆盖）。

**优先级 P1 不 P0 的原因**：当前还没有 CI 流程能自动跑这个测试；功能上仍然手工把关。但拆分后渲染器数量已从 3 增长到 13，没有 fixture 时回归风险显著上升。

---

## P2 · 引擎限制（需新增依赖或大改）

### 5. 实现导出端阴影模糊（box blur）

**影响模板**：Date Stamp（HIGH 严重度，LCD 橙光晕缺失）、Photo Album（MEDIUM，照片纸下方柔和阴影变成硬色块）。

**方案 A · 引入 `imageproc`**：
- 在 `Cargo.toml` 添加 `imageproc = "0.25"`（约 600KB 编译体积）。
- 用 `imageproc::filter::gaussian_blur_f32` 对独立的 shadow layer 做模糊后 `overlay` 到主画布。
- 流程：先在透明 RGBA buffer 上画一个偏移色块 → blur → overlay 到主 canvas → 再画前景。
- Date Stamp：对橙色文字单独渲染一份 → blur 后 overlay → 再渲染锐利文字（实现 LCD glow）。
- Photo Album：对 photo paper 矩形先渲染阴影色块，blur 18px → overlay → 再渲染白色 paper。

**方案 B · 自实现 box blur**：
- ~80 行代码（垂直 + 水平两次 1D 卷积）。
- 不引入新依赖但运行慢，4K 图上单次 box blur 约 100-200ms；建议只对小区域（shadow bbox + padding）做。

**推荐**：先用方案 B 验证视觉效果，若可接受则保留；若性能不达标，再换方案 A。

**工作量**：方案 B 4-6 小时；方案 A 2-3 小时（含依赖审查）。

---

### 6. 实现导出端文本/图层旋转（PROOF 印章）

**影响模板**：Darkroom Proof（HIGH 严重度，PROOF 印章直立显得呆板）。

**方案**：
- `image::imageops::rotate_about_center` 不存在；`image` crate 只有 90/180/270 度刚性旋转。
- 引入 `imageproc::geometric_transformations::rotate`（提供任意角度 + bilinear 重采样）；或自实现仿射变换。
- 流程：在透明 buffer 上以 0° 渲染 PROOF + 边框 → 旋转 -8° → overlay 到主画布的目标位置（需补偿旋转后的 bbox 平移）。
- 旋转中心选 stamp bbox 中心；overlay 时调整 placed_x/placed_y 以保持视觉中心不变。

**工作量**：3-4 小时。

**优先级 P2**：仅影响一款模板的一个元素（PROOF 红章），用户用其它模板不受影响。

---

### 7. Italic 字体支持（Photo Album）

**影响模板**：Photo Album 题注的"草书感"在导出端丢失。

**方案 A · 引入 italic 字体**：
- 在 `src-tauri/fonts/` 加一份 italic TTF（如 `Inter-Italic.ttf`），或下载 `PlayfairDisplay-Italic.ttf`（已有 regular 版本）。
- `TextRenderer` 增加 `italic: FontVec` 字段与 `draw_italic` 方法。
- 仅 Photo Album 模板调用 italic 路径，其它保持现状。
- 二进制体积 +300KB（Inter-Italic）或 +200KB（Playfair-Italic）。

**方案 B · 仿斜体（shear）**：
- 不引入新字体，对每个 glyph 在绘制时应用水平剪切变换（约 0.2 弧度，模拟斜体）。
- 实现简单（在 `text.rs::draw` 内 cursor_x 计算时按 y 偏移），无依赖。
- 视觉上不如真正的 italic 字体专业，但能保持"手写感"差异。

**推荐**：方案 B，因为只用一处。

**工作量**：方案 B 1-2 小时。

---

### 8. 等宽字体支持（Date Stamp / Contact Sheet / Crop Marks）

**影响模板**：三款模板的 EXIF / 标签在 TS 强制 `"Courier New", "Menlo"`，体现"打字机"质感；导出端用全局字体（多为无衬线），观感不同。

**方案**：
- 在 `src-tauri/fonts/` 加一份等宽字体（`JetBrainsMono-Regular.ttf` 或 `IBMPlexMono-Regular.ttf`）。
- `TextRenderer` 增加 `mono: Option<FontVec>` 字段，新增 `measure_mono` / `draw_mono` 方法。
- 三款模板特定文本（Date Stamp 整个日期戳、Contact Sheet 的 `→ FRAME 24A` 与 EXIF、Crop Marks 的 EXIF）调用 mono 路径。
- 二进制体积 +200KB。

**工作量**：3-4 小时。

**关联**：方案 7 的 italic 与方案 8 的 mono 可合并实现，TextRenderer 改为支持多 face 加载。

---

## P3 · 体验优化（非阻塞）

### 9. 模板缩略图自动生成

**现状**：模板选择面板 / Web 展示页都用同一张 sample 图实时渲染缩略图。打开模板列表时同时跑 13 个 Canvas 渲染器，首屏可感知卡顿。

**方案**：build 时跑一次脚本，把每款模板的 800px 宽缩略图烘焙为 `public/template-thumbnails/<kind>.webp`，列表 UI 直接显示静态图，编辑面板内仍走实时渲染。

**工作量**：2-3 小时（含 build 脚本 + UI 接入）。

---

### 10. 模板预设系统

**现状**：每款模板的字号、间距、颜色都在 TS 文件里硬编码。用户无法把 Photo Album 改成"自己喜欢的颜色"再保存。

**方案**：扩展 `template-registry.ts` 增加 `presets: Record<string, Partial<TemplateConfig & FrameParams>>` 字段；UI 在每款模板下展示"风格预设"切换器。

**工作量**：评估 + 设计 4 小时；最小可行实现 6-8 小时。

---

## 跟踪

完成项请：
1. 在该项标题前加 `~~删除线~~` 并注明 commit hash。
2. 用户可感知的变更同步追加到 `CHANGELOG.md`。
3. 当本文档某段（P0/P1/P2/P3）全部完成，整段移除并在 PLAN.md 对应章节增补简述。
