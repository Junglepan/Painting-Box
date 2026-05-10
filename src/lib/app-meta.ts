import pkg from "../../package.json";

export const APP_VERSION = pkg.version as string;
export const GITHUB_OWNER = "Junglepan";
export const GITHUB_REPO = "Painting-Box";
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_URL}/releases/latest`;
export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

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
