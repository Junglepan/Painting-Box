import pkg from "../../package.json";

export const APP_VERSION = pkg.version as string;
export const GITHUB_OWNER = "Junglepan";
export const GITHUB_REPO = "Painting-Box";
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_URL}/releases/latest`;
export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export const SOCIAL_LINKS = [
  {
    platform: "GitHub",
    short: "GitHub",
    handle: "Junglepan",
    url: GITHUB_URL,
    title: "GitHub @Junglepan",
  },
  {
    platform: "小红书",
    short: "小红书",
    handle: "StudentPanbk",
    url: "https://www.xiaohongshu.com/search_result?keyword=StudentPanbk&type=51",
    title: "小红书 @StudentPanbk",
  },
  {
    platform: "bilibili",
    short: "B站",
    handle: "土豆怪725",
    url: "https://search.bilibili.com/all?keyword=%E5%9C%9F%E8%B1%86%E6%80%AA725&search_type=bili_user",
    title: "B站 @土豆怪725",
  },
  {
    platform: "抖音",
    short: "抖音",
    handle: "土豆怪",
    url: "https://www.douyin.com/search/914189405?type=user",
    title: "抖音 @土豆怪 · 抖音号 914189405",
  },
] as const;

/** Compare semver-like x.y.z. Returns positive if `a > b`, negative if `a < b`, 0 equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
