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

async function svgToDataUrl(src: string): Promise<string> {
  try {
    const resp = await fetch(src);
    const text = await resp.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  } catch {
    return src;
  }
}
