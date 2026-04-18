# Painting-Box 开发方案

> 一款为摄影爱好者设计的照片水印/画框生成工具，让拍摄的照片"自带相机参数展示卡"，优雅分享到社交平台。

## 1. 项目定位

**目标用户**：摄影爱好者（微单/单反/手机拍摄，需分享到社交平台）

**核心差异化**：
- 比 yiyin 更现代的 UI（shadcn/ui + Tailwind，Linear/Vercel 风）
- Canvas 预览即时响应 + Rust 批量导出高性能
- 预设保存 / 复用（用户可沉淀个人风格）

## 2. 最终决策

| 维度 | 决策 |
|------|------|
| 支持平台 | macOS (Apple Silicon + Intel) + Windows |
| 技术栈 | Tauri 2 + React 18 + TypeScript + Vite |
| UI 框架 | shadcn/ui + Tailwind CSS |
| 状态管理 | Zustand |
| 图像处理 | Rust `image` crate + `kamadak-exif`（导出端）；JS `exifr`（预览端） |
| 渲染策略 | **混合**：Canvas 预览 + Rust 导出 |
| 批处理规模 | 50-100 张 / 次（性能基线） |
| 语言 | 仅中文（首版） |
| 发布方式 | GitHub Release（CI 构建） |
| 分支策略 | `master` 主干 + `feat/*` 功能分支 |
| 视觉风格 | 现代简约（Linear/Vercel 深色主题） |

## 3. 架构分层

```
Presentation (React + shadcn/ui)
  │  PhotoList │ PreviewPane(Canvas) │ TemplatePanel
  ↓ Zustand
Business Layer
  │  WatermarkRenderer │ PresetManager │ ExportQueueManager
  ↓ invoke / event
Tauri Bridge (Rust)
  │  load_photo │ render_export │ batch_export │ preset_crud
  ↓
System: 文件系统 + 品牌资源(SVG) + 字体
```

## 4. 核心数据模型

```typescript
type Photo = {
  id: string;
  path: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
  exif: ExifData;
};

type ExifData = {
  camera: { make: string; model: string };
  lens: string;
  iso: number;
  aperture: number;
  shutterSpeed: string;
  focalLength: number;
  takenAt: string;
  gps?: { lat: number; lng: number };
  raw: Record<string, unknown>;
};

type WatermarkTemplate = {
  id: string;
  name: string;
  kind: 'classic-bottom' | 'polaroid' | 'minimal-corner' | 'magazine' | 'custom';
  config: TemplateConfig;
};

type Preset = {
  id: string;
  name: string;
  templateId: string;
  overrides: Partial<TemplateConfig>;
  fieldVisibility: Record<keyof ExifData, boolean>;
  fieldOverrides: Partial<Record<keyof ExifData, string>>;
  createdAt: string;
};
```

## 5. 目录结构

```
Painting-Box/
├── .claude/agents/              5 个专职 agent 配置
├── src/                         前端
│   ├── components/
│   │   ├── layout/              三栏布局
│   │   ├── photo-list/          左侧照片列表
│   │   ├── preview/             中间 Canvas 预览
│   │   └── panel/               右侧模板+EXIF+导出
│   ├── stores/                  Zustand stores
│   ├── lib/
│   │   ├── watermark/           前端水印渲染引擎
│   │   ├── exif/                EXIF 工具
│   │   └── tauri/               Tauri invoke 包装
│   ├── templates/               5 套模板定义
│   └── App.tsx
├── src-tauri/                   Rust 后端
│   ├── src/
│   │   ├── commands/            Tauri 命令
│   │   ├── exif/                EXIF 解析
│   │   ├── render/              水印合成
│   │   └── preset/              预设持久化
│   ├── assets/
│   │   ├── brands/              相机品牌 SVG
│   │   └── fonts/               内嵌字体
│   └── Cargo.toml
└── docs/
    ├── PLAN.md                  本方案
    ├── ARCHITECTURE.md          架构细节
    └── TEMPLATES.md             模板规格
```

## 6. 内置水印模板（MVP 5 套）

| # | 名称 | 风格 | 应用 |
|---|------|------|------|
| 1 | 经典黑底栏 | 图片下方黑栏，左 Logo 右参数 | 通用 |
| 2 | 经典白底栏 | 白底黑字 | 极简 |
| 3 | 宝丽来白边 | 四周留白+底部粗体信息 | 文艺 |
| 4 | 极简角标 | 右下角小字参数 | Ins 风 |
| 5 | 杂志横幅 | 顶部+底部双栏，大字 Logo | 潮流 |

每套模板包含：Logo 位置/大小、字段选择（相机/镜头/参数/时间/GPS）、字号/字重/颜色、间距/对齐。

## 7. 性能目标

| 场景 | 目标 | 策略 |
|------|------|------|
| 启动时间 | < 1.5s | Tauri 2 + Vite 懒加载 |
| 单图预览响应 | < 100ms | 缩略图 1024px + Canvas |
| 单图导出 (24MP) | < 800ms | Rust image + SIMD |
| 批量 50 张导出 | < 20s | Rayon 多核并发 |
| 内存峰值 (50 张) | < 800MB | 流式处理 |

## 8. 开发路线图

### Phase 1 · 骨架 (1-2 天)
- 项目初始化（Tauri + React + TS + Vite）
- Tailwind + shadcn/ui 集成
- 基础三栏布局 + 深色主题
- Zustand store 骨架
- Tauri 命令最小跑通

### Phase 2 · 核心链路 (3-5 天)
- 拖拽/选择导入
- Rust 读图 + EXIF 解析 + 缩略图
- 照片列表 + EXIF 面板
- Canvas 渲染引擎（首模板）
- 单张 Rust 合成导出

### Phase 3 · 模板库 (3-4 天)
- 5 套模板完整实现
- 品牌 Logo SVG 资源
- 模板切换实时预览
- EXIF 字段编辑/隐藏

### Phase 4 · 批量与预设 (3-4 天)
- 批量导出队列（进度/取消）
- 预设 CRUD（本地 JSON）
- 预设应用到批量

### Phase 5 · 体验打磨 (2-3 天)
- Framer Motion 动效
- 快捷键
- 错误边界 + Toast
- 大图/多图性能调优

### Phase 6 · 发布 (2 天)
- GitHub Actions CI（macOS + Windows）
- 签名/notarization
- v0.1.0 Release

**总估时：14-20 天**

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| macOS 签名/公证复杂 | 发布阻塞 | 首版接受未签名弹窗，V2 申请开发者账号 |
| EXIF 字段厂商差异 | 部分相机显示不全 | 字段映射表 + 降级到 raw |
| 超大 RAW 加载慢 | 预览卡顿 | MVP 仅 JPG/HEIC，RAW 在 V2 |
| Canvas 与 Rust 渲染差异 | 用户困惑 | 统一字体/字号公式，端到端截图对比 |
| 字体版权 | 法律风险 | 仅开源字体（思源黑体、Noto Sans） |
