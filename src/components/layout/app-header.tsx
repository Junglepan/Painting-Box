import { useEffect, useState } from "react";
import { Camera, CheckCheck, Globe, HelpCircle, Loader2, Download, ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { useExportStore } from "@/stores/export-store";
import { isTauri } from "@/lib/env";
import { APP_VERSION, GITHUB_URL, GITHUB_LATEST_RELEASE_URL } from "@/lib/app-meta";
import { useLatestRelease } from "@/lib/use-latest-release";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { HelpDialog } from "./help-dialog";

function ExportBadge() {
  const jobs = useExportStore((s) => s.jobs);
  const isRunning = useExportStore((s) => s.isRunning);
  const [justDone, setJustDone] = useState(false);

  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const errors = jobs.filter((j) => j.status === "error").length;
  const allSettled = total > 0 && done === total;

  useEffect(() => {
    if (allSettled && !isRunning) {
      setJustDone(true);
      const t = window.setTimeout(() => setJustDone(false), 2500);
      return () => window.clearTimeout(t);
    }
  }, [allSettled, isRunning]);

  if (!isRunning && !justDone) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
        justDone && !isRunning
          ? errors > 0
            ? "bg-destructive/10 text-destructive"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-primary/8 text-primary",
      )}
    >
      {justDone && !isRunning ? (
        <>
          <CheckCheck className="h-3 w-3" />
          <span>{errors > 0 ? `${errors} 张失败` : "导出完成"}</span>
        </>
      ) : (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>导出中 {done}/{total}</span>
        </>
      )}
    </div>
  );
}

function VersionBadge() {
  const { release } = useLatestRelease();
  const hasUpdate = Boolean(release?.hasUpdate);
  const href = hasUpdate ? release!.htmlUrl : GITHUB_LATEST_RELEASE_URL;
  const title = hasUpdate
    ? `当前 v${APP_VERSION}，新版本 v${release!.version} 可用 — 点击下载`
    : `v${APP_VERSION} — 点击查看最新版本`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        hasUpdate
          ? "bg-primary/12 text-primary hover:bg-primary/18"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      v{APP_VERSION}
      {hasUpdate ? <Download className="h-2.5 w-2.5" /> : <ExternalLink className="h-2.5 w-2.5" />}
    </a>
  );
}

export function AppHeader() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_6px_rgba(47,111,237,0.35)]">
            <Camera className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            Painting Box
          </span>
          <VersionBadge />
        </div>

        <div className="flex items-center gap-1">
          {!isTauri() ? (
            <span className="mr-1 flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
              <Globe className="h-3 w-3" />
              演示模式 · 仅预览
            </span>
          ) : null}
          <ExportBadge />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            title="GitHub 仓库"
            aria-label="GitHub 仓库"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <GithubIcon className="h-3.5 w-3.5" />
          </a>
          <ThemeToggle />
          <button
            type="button"
            title="使用说明"
            aria-label="使用说明"
            onClick={() => setHelpOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
