# Painting Box

为摄影爱好者设计的照片水印工具，让相机参数优雅地随照片呈现。

![版本](https://img.shields.io/badge/version-0.1.0-blue)
![平台](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## 功能

- **水印模板**：经典底栏、极简角标，实时预览所见即所得
- **相机品牌 Logo**：自动识别 50+ 品牌，支持 original / black / white 三种变体
- **参数展示**：机身型号、镜头、焦距、光圈、快门、ISO 自由组合
- **批量导出**：rayon 并行处理，支持 JPG / PNG / WebP，默认目录零弹窗
- **预设管理**：保存/复用参数组合，支持重命名
- **内置字体**：Inter 字体编译进二进制，导出文字在任何系统均可渲染
- **无 EXIF 自适应**：无信息照片自动隐藏水印区域，照片居中

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS + Zustand |
| 后端 | Tauri 2 + Rust |
| 图像处理 | libjpeg-turbo（解码/编码）+ fast_image_resize（SIMD 缩放）|
| 字体渲染 | ab_glyph |
| Logo | resvg（SVG 光栅化）|

## 本地构建

**依赖**

- [Rust](https://rustup.rs/) + Cargo
- [Bun](https://bun.sh/)
- cmake + nasm（编译 libjpeg-turbo）

```bash
# macOS
brew install cmake nasm

# 安装前端依赖
bun install

# 开发模式
bunx tauri dev

# 生产构建
bunx tauri build
```

## 使用

1. 启动后拖入照片或点击列表空白区域导入
2. 在右侧参数面板调整模板样式
3. 设置默认导出目录（一次设置，后续零弹窗）
4. 点击照片条目的导出按钮或使用批量导出

## 作者

[@panbokui](https://github.com/panbokui)

## License

MIT
