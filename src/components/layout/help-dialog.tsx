import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const HELP_SECTIONS: { title: string; items: { label: string; desc: string }[] }[] = [
  {
    title: "顶部栏",
    items: [
      { label: "Painting Box · 版本徽章", desc: "点击跳转到 GitHub 最新发行页，可以下载最新安装包。" },
      { label: "GitHub 图标", desc: "打开仓库主页查看源码、提交 Issue 或星标项目。" },
      { label: "外观开关", desc: "切换亮色 / 暗色 / 跟随系统三种主题模式。" },
      { label: "帮助按钮", desc: "打开本说明窗口，查看每个按钮的用途。" },
      { label: "导出徽章", desc: "导出过程中显示进度，导出完成后短暂显示成功状态。" },
    ],
  },
  {
    title: "左侧 · 照片列表",
    items: [
      { label: "导入照片", desc: "点击或拖拽照片到窗口任意位置即可导入。" },
      { label: "选中照片", desc: "点击列表中的照片切换预览，参数面板会同步显示当前模板的可调项。" },
      { label: "复制 EXIF", desc: "把这张照片的拍摄参数复制到剪贴板，方便贴到说明文字里。" },
      { label: "移除", desc: "从列表中移除照片（不会删除磁盘文件）。" },
      { label: "导出 / 批量导出", desc: "导出当前选中照片或全部照片，自动应用当前模板与参数。" },
    ],
  },
  {
    title: "中间 · 预览区",
    items: [
      { label: "实时预览", desc: "调整任何参数都会即刻反映到这里。预览基于缩略图，导出会用全分辨率。" },
      { label: "未导入照片时", desc: "显示样图 + Painting Box 品牌信息，便于查看模板视觉。" },
    ],
  },
  {
    title: "右侧 · 参数面板",
    items: [
      { label: "模板库", desc: "在底部横向滚动选择不同模板。鼠标滚轮也能滚动。" },
      { label: "布局", desc: "调整画布比例、画布方向（横/竖/自动）、主图占比、上下边距等。" },
      { label: "背景", desc: "白 / 黑 / 自定颜色 / 模糊（仅经典底栏支持模糊）。" },
      { label: "阴影", desc: "开启后可调整模糊度、下移、强度。模板支持时才会显示。" },
      { label: "照片", desc: "圆角、边框宽度 / 样式 / 颜色。" },
      { label: "文字", desc: "字体、字号、颜色（自动按背景对比，或手动指定）。" },
      { label: "Logo", desc: "选择品牌 Logo（auto 跟随背景对比）、尺寸、间距。" },
      { label: "显示项", desc: "开关 Logo / 机身 / 镜头 / 参数 / 日期。" },
      { label: "内容", desc: "自定义文字行（最多 2 行）、日期格式选择。" },
    ],
  },
  {
    title: "预设",
    items: [
      { label: "保存预设", desc: "把当前模板 + 参数组合保存为预设，方便不同照片快速套用。" },
      { label: "应用预设", desc: "点击预设卡片即可一键恢复对应的视觉风格。" },
    ],
  },
];

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative flex h-full max-h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-popover-foreground",
          "shadow-[var(--shadow-apple-popover)]",
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 id="help-dialog-title" className="text-sm font-semibold tracking-tight">
            使用说明
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {HELP_SECTIONS.map((section) => (
            <section key={section.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <dl className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <dt className="text-[12px] font-medium text-foreground">{item.label}</dt>
                    <dd className="text-[11px] leading-relaxed text-muted-foreground">{item.desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="shrink-0 border-t border-border/60 px-5 py-2.5 text-[10px] text-muted-foreground">
          按 Esc 或点击窗口外部关闭
        </footer>
      </div>
    </div>
  );
}
