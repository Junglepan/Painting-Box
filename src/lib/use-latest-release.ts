import { useEffect, useState } from "react";
import { APP_VERSION, GITHUB_API_LATEST_RELEASE, compareVersions } from "@/lib/app-meta";

export type LatestRelease = {
  version: string;        // tag name without leading v
  htmlUrl: string;        // github release page URL
  publishedAt: string;
  hasUpdate: boolean;     // true if remote > local
};

const CACHE_KEY = "painting-box.release-cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type Cache = { fetchedAt: number; data: LatestRelease };

function readCache(): Cache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: LatestRelease) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), data } satisfies Cache),
    );
  } catch {
    // storage unavailable
  }
}

export type CheckStatus = "idle" | "checking" | "ok" | "error";

async function fetchLatest(): Promise<LatestRelease | null> {
  const resp = await fetch(GITHUB_API_LATEST_RELEASE, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!resp.ok) return null;
  const json = (await resp.json()) as { tag_name: string; html_url: string; published_at: string };
  const version = json.tag_name.replace(/^v/, "");
  return {
    version,
    htmlUrl: json.html_url,
    publishedAt: json.published_at,
    hasUpdate: compareVersions(version, APP_VERSION) > 0,
  };
}

/** Fetch latest GitHub release on mount; cached 6h. Returns release info + manual refresh. */
export function useLatestRelease() {
  const [release, setRelease] = useState<LatestRelease | null>(() => readCache()?.data ?? null);
  const [status, setStatus] = useState<CheckStatus>("idle");

  const refresh = async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setRelease(cached.data);
        setStatus("ok");
        return cached.data;
      }
    }
    setStatus("checking");
    try {
      const data = await fetchLatest();
      if (data) {
        setRelease(data);
        writeCache(data);
        setStatus("ok");
      } else {
        setStatus("error");
      }
      return data;
    } catch {
      setStatus("error");
      return null;
    }
  };

  useEffect(() => {
    if (readCache()) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { release, status, refresh };
}
