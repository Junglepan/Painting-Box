# 拟态 x Apple 融合风格文档（v1.1 · Painting-Box 实践版）

> v1.0 为通用理论（Apple 70% + 拟态 30%）。
> v1.1 基于 Painting-Box 落地后的经验修订，新增"唯一下凹"、"同层级扁平"、
> "Icon-first"、"多层 Apple 阴影"四条核心原则，并对齐 `src/index.css` 的 tokens。

## 1. 风格定位
以 **Apple 的清晰层级与克制秩序** 为骨架，叠加 **Soft UI（拟态）的轻触感**，
在工具类桌面应用中体现「专业工具感 + 现代系统感」，避免厚重拟物和低对比。

## 2. 视觉关键词
清爽 · 轻柔 · 克制 · 可操作感 · 高可读 · 系统级一致性

## 3. 核心原则（v1.1 新增 / 强调）

### 3.1 唯一下凹原则 🔑
**整个界面中只有一个区域是下凹（inset）的** —— 即主内容的展示画布（预览区 / 画布 / 编辑区）。
其余所有面板（侧边栏、工具栏、参数面板、列表）**保持扁平、同层级**，
只通过细分隔线区分区域。

> 反模式：三栏都套 `card-apple`，嵌套多层阴影造成"漂浮板堆叠"。

实现：`.surface-inset`

### 3.2 同层级扁平布局
- 主框架不用卡片 / 盒子堆叠，而用 `.divider-v`（渐隐细线）分隔区域。
- 同层级组件共享页面背景渐变（`--background-gradient`），不各自开背景色。
- 只有交互控件（按钮、chip、输入框、缩略图）才保留微拟态凹凸。

### 3.3 Icon-first 引导
- 区域标题优先使用 **小图标 + 极简标签**（`h-3.5 w-3.5` icon + `text-[11px]`）。
- 操作按钮默认 icon-only（带 `aria-label` / `title`），仅高频核心操作配短文字。
- 空状态用图标 + 不超过 6 字提示，删除"从左侧选择照片或拖入图片文件"这类引导话术。
- 模板 / 预设 / 选项以 icon grid 呈现，hover/active 再辅以提示。

### 3.4 多层 Apple 阴影（取代单层拟态阴影）
Apple 质感的关键是**多层叠加**，而不是单一模糊阴影：

```
0 0 0 0.5px  → crisp hairline（边缘定义）
0 1px 2px    → contact shadow（接触阴影）
0 6-12px     → near-field（近场柔阴影）
0 16-28px    → far halo（远场环境光）
```

实现：`--shadow-apple-card`（平层卡片）· `--shadow-apple-elevated`（抬起层）·
`--shadow-apple-popover`（最高层）

### 3.5 主色染色阴影
主按钮不用中性灰阴影，改用**带主色染色**的多层阴影（让按钮"看起来会发光"）：

```css
--shadow-primary-raised:
  inset 0 1px 0 rgba(255,255,255,0.25),    /* 顶部高光 */
  inset 0 -1px 0 rgba(0,0,0,0.15),         /* 底部暗边 */
  0 2px 6px rgba(47,111,237,0.30),         /* 近场蓝染 */
  0 8px 20px rgba(47,111,237,0.22);        /* 远场蓝染 */
```

### 3.6 Apple 缓动曲线
`ease-out` 过于通用，改用 Apple HIG 风格的贝塞尔：

| 变量 | 曲线 | 用途 |
|------|------|------|
| `--ease-apple` | `cubic-bezier(0.32, 0.72, 0, 1)` | 默认过渡 |
| `--ease-apple-spring` | `cubic-bezier(0.2, 0.8, 0.2, 1.1)` | 弹性入场 |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | 大位移 / 浮层 |

时长分档：**80ms**（pressed 反馈）· **180ms**（hover/color）· **220ms**（阴影/transform）·
**280ms**（卡片/面板）· **500ms**（入场动画）。

### 3.7 单层 focus 环
放弃 `ring-offset` 双重描边（会产生"双线包围"的视觉噪音），改为：
```css
@apply outline-none ring-2 ring-ring/50;
```
半透明主色环既醒目又不抢戏。

## 4. 设计 Tokens（Painting-Box 实装）

### 4.1 颜色
| Token | 值 | 用途 |
|-------|-----|------|
| `--background` | `#EEF1F6` | 页面基础背景 |
| `--background-gradient` | 径向渐变（左上+右下主色淡染）| 页面实际 body 背景 |
| `--foreground` | `#1F2937` | 主文字 |
| `--muted-foreground` | `#6B7280` | 次文字 |
| `--primary` | `#2F6FED` | 主色 |
| `--accent` | `#DDE7FF` | 选中态底色 |
| `--success` / `--warning` / `--destructive` | `#2E9B57` / `#C58A1A` / `#C64B4B` | 状态色 |
| `--border` / `--input` | `#D7DCE6` | 分隔 / 边框 |

### 4.2 圆角
- 卡片 / 主面板：`14px`（`--radius`）
- 控件（按钮、输入、chip）：`6-10px`（`--radius-md` / `--radius-sm`）

### 4.3 阴影（见 `src/index.css`）
- 层级阴影：`--shadow-apple-card` / `-elevated` / `-popover`
- 拟态阴影：`--shadow-neu-raised` / `-raised-hover` / `-pressed` / `-inset`
- 主按钮阴影：`--shadow-primary-raised` / `-hover` / `-pressed`
- 选中环：`--ring-selected`（白描边 + 主色淡环双层）

### 4.4 字体
`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`；
开启 `font-feature-settings: "ss01", "cv11"` 获得 SF 数字更紧凑字形。

## 5. 组件规范

### 5.1 面板容器
- 主框架 3 栏布局：**参数区（左）· 画布（中）· 辅助列表（右）**。
- 侧栏不加背景 / 阴影，直接用页面背景；栏间用 `.divider-v`（1px 渐隐线）分隔。
- 画布区统一使用 `.surface-inset`（下凹），内部内容可再叠 `--shadow-apple-elevated` 悬浮卡片。

### 5.2 按钮
- `.btn-neu`：次要操作 / 工具按钮，默认轻凸 → hover 微抬升 → active 轻凹。
- `.btn-primary`：主操作，用主色染色阴影，hover 略提亮度 `filter: brightness(1.04)`。
- Icon-only 按钮尺寸 `h-8 w-8 px-0`，必须配 `aria-label`。

### 5.3 输入 / 数值微调
- `.input-neu`：常态内凹，focus 用主色半透明环。
- `.num-input`：紧凑数字（`h-7 w-14`）搭 `tabular-nums`，边距 / 坐标类参数首选。

### 5.4 选择控件（chip）
`.chip` / `.chip-active`：灰底轻凸 → 选中染主色（用 `--shadow-primary-raised`）。
组合图标可全屏网格呈现（`chip-icon` 变体为 `h-7 w-7 px-0`）。

### 5.5 列表项
- 次要列表（如照片缩略图）：`inset` 阴影 + 1px 边框，选中态 `border-primary/60` + 卡片阴影。
- 主要列表（如模板 / 预设）：`.tile` 轻凸 → `.tile-active` 主色渐变底 + 选中环。

### 5.6 开关（Switch）
自定义 `h-5 w-9` 圆角轨道，选中切主色，拇指 `h-4 w-4` 带 1-3px 黑色小阴影。

### 5.7 滑块
原生 `<input type="range">` + `accent-primary`，值用 `tabular-nums` 右对齐显示，
小空间够用；需要自定义轨道时再替换为 shadcn Slider。

## 6. 交互与动效
- Hover：抬升 `translateY(-1px)` + 阴影从 `raised` → `raised-hover`。
- Active：`translateY(0) scale(0.98)` + 阴影切到 `pressed`，`transition-duration: 80ms`。
- Focus-visible：`ring-2 ring-ring/50`（单层）。
- 禁用：`opacity-55`，切 `shadow-neu-inset`，禁止 transform。
- 入场：`animate-in fade-in duration-500`；大跨度位移再叠 `slide-in-from-bottom-2`。

## 7. 排版 / 密度
- Header 高度：`h-11` ~ `h-12`。
- 面板内边距：`px-4`；区域之间 `space-y-5`；控件间 `gap-1.5` ~ `gap-2`。
- 标签字号：`text-[11px]` uppercase + tracking-wider（区域标题）；`text-[13px]`（主要标签）；
  `tabular-nums` 处理所有数值显示。

## 8. 禁止项（v1.1 新增）
- ❌ 多区域同时使用下凹阴影（破坏"唯一下凹"原则）。
- ❌ 每个面板都套 `.card-apple`（过度堆叠层级）。
- ❌ 双重 focus 描边（`ring-offset` + `ring`）。
- ❌ 区域标题全部用长文字 + 图标（优先 icon-led，再看是否需要文字）。
- ❌ 全局单一阴影变量（应按层级选择 card / elevated / popover）。
- ❌ 用 `ease-out` 作为唯一缓动（至少分入 Apple 三档）。
- ❌ 浅灰字配浅灰底（v1.0 已有，强调）。
- ❌ 阴影半径过大致糊边（v1.0 已有，强调）。
- ❌ 单靠颜色表达状态（v1.0 已有，强调）。

## 9. 一句话规范
> **"唯一下凹展示画布，其余同层级扁平；Apple 分层阴影定秩序，拟态微凹凸给反馈，
> 图标引导、文字克制、动效分档。"**

## 10. 参考实现
- CSS tokens & 组件类：`src/index.css`
- 三栏扁平 + 细线分隔：`src/components/layout/app-shell.tsx`
- 下凹画布：`src/components/preview/preview-pane.tsx`（`.surface-inset`）
- Icon-first 参数面板：`src/components/panel/frame-params-panel.tsx`
- 弱化次要列表：`src/components/photo-list/photo-list.tsx`
