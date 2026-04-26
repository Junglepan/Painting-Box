import { getLogoSvg } from "@/lib/tauri/logo";

/// Load a logo via the Tauri command so SVG bytes come from embedded assets
/// rather than the asset server — bypassing the Windows WebView2 SVG MIME bug.
export async function loadLogoImage(
  key: string,
  variant: string,
): Promise<HTMLImageElement | null> {
  try {
    const svgText = await getLogoSvg(key, variant);
    if (!svgText) return null;
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ensureSvgDimensions(svgText))}`;
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo 加载失败"));
      image.src = src;
    });
  } catch {
    return null;
  }
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  // On Windows WebView2, SVG files loaded via <img src> can fail due to MIME
  // type or protocol restrictions. Fetch the SVG text and convert to a data URL
  // to guarantee loading regardless of platform.
  const resolvedSrc = src.toLowerCase().includes(".svg")
    ? await svgToDataUrl(src)
    : src;

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = resolvedSrc;
  });
}

// SVGs from Adobe Illustrator often have viewBox but no width/height.
// WebView2 on Windows renders them as 0x0 without explicit dimensions.
function ensureSvgDimensions(svg: string): string {
  if (/\bwidth\s*=/.test(svg)) return svg;
  const match = svg.match(/viewBox="[^"]*\s+([0-9.]+)\s+([0-9.]+)"/);
  if (!match) return svg;
  return svg.replace("<svg", `<svg width="${match[1]}" height="${match[2]}"`);
}

async function svgToDataUrl(src: string): Promise<string> {
  try {
    const resp = await fetch(src);
    const text = await resp.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  } catch {
    return src;
  }
}
