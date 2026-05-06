import { jsPDF } from "jspdf";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader failed on ${url}`));
    reader.readAsDataURL(blob);
  });
}

/** Inline every <image href="…"> into a base64 data URL. Without this the
 *  browser refuses to load relative/absolute URLs from inside a serialized
 *  SVG blob (sandboxed). */
async function inlineImages(svg: SVGSVGElement): Promise<void> {
  const images = Array.from(svg.querySelectorAll("image"));
  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute("href") ?? img.getAttributeNS(XLINK_NS, "href");
      if (!href || href.startsWith("data:")) return;
      try {
        const absUrl = new URL(href, document.baseURI).toString();
        const dataUrl = await fetchAsDataUrl(absUrl);
        img.setAttribute("href", dataUrl);
        img.removeAttributeNS(XLINK_NS, "href");
      } catch (err) {
        console.warn("inline image failed:", href, err);
      }
    })
  );
}

/** Walk every same-origin stylesheet, find @font-face rules, fetch each
 *  url(...) and rewrite to a data: URL. The result is plain CSS text we can
 *  drop inside an SVG <style> so the rasterizer has fonts available without
 *  any network access (which SVG-in-Image disallows). */
async function buildInlinedFontCss(): Promise<string> {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // CORS-blocked stylesheet
    }
    if (!rules) continue;
    // Relative font URLs in @font-face are resolved against the *stylesheet*
    // URL, not the document URL. Next.js bundles fonts under
    // /_next/static/css/...css with `url(../media/foo.woff2)` references —
    // resolving against document.baseURI gives /media/foo (404), resolving
    // against sheet.href gives /_next/static/media/foo (correct).
    const baseUrl = sheet.href ?? document.baseURI;
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      let cssText = rule.cssText;
      const urlMatches = Array.from(
        cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)
      );
      for (const m of urlMatches) {
        const url = m[1];
        if (url.startsWith("data:")) continue;
        try {
          const absUrl = new URL(url, baseUrl).toString();
          const dataUrl = await fetchAsDataUrl(absUrl);
          cssText = cssText.replace(m[0], `url(${dataUrl})`);
        } catch (err) {
          console.warn("inline font url failed:", url, err);
        }
      }
      out.push(cssText);
    }
  }
  return out.join("\n");
}

/** Serialize the SVG with all external assets (fonts, images) inlined as
 *  data URLs, decode it back through an Image element, and paint it onto a
 *  canvas at `pixelRatio` resolution. Returns the canvas's PNG data URL. */
async function rasterizeSvg(
  svg: SVGSVGElement,
  width: number,
  height: number,
  pixelRatio: number
): Promise<string> {
  if (typeof document !== "undefined") {
    await document.fonts.ready;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("preserveAspectRatio");

  // Reset any zoom/pan applied by d3.zoom — every tree view uses the
  // `.zoom-layer` group to host its content, and pan/zoom mutates that
  // group's transform attribute. We want exports to look like the default
  // (un-zoomed) view regardless of where the user is on screen.
  for (const layer of Array.from(clone.querySelectorAll(".zoom-layer"))) {
    layer.removeAttribute("transform");
  }

  await inlineImages(clone);

  const fontCss = await buildInlinedFontCss();
  if (fontCss) {
    const styleEl = document.createElementNS(SVG_NS, "style");
    styleEl.setAttribute("type", "text/css");
    styleEl.textContent = fontCss;
    clone.insertBefore(styleEl, clone.firstChild);
  }

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.src = svgUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG → Image decode failed"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Export the SVG to a PNG file at `viewBox × pixelRatio` resolution. */
export async function exportSvgToPng(
  svg: SVGSVGElement,
  filename = "family-tree.png",
  pixelRatio = 4
): Promise<void> {
  const vbW = svg.viewBox.baseVal.width || svg.clientWidth;
  const vbH = svg.viewBox.baseVal.height || svg.clientHeight;
  const dataUrl = await rasterizeSvg(svg, vbW, vbH, pixelRatio);
  triggerDownload(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`);
}

/**
 * Export the SVG to a PDF file. The same rasterization pipeline as the PNG
 * export is used, then the resulting bitmap is dropped into a PDF page —
 * with aspect-preserving fit when the requested page size differs.
 */
export async function exportSvgToPdf(
  svg: SVGSVGElement,
  filename = "family-tree.pdf",
  pixelRatio = 4,
  page?: { width: number; height: number }
): Promise<void> {
  const vbW = svg.viewBox.baseVal.width || svg.clientWidth;
  const vbH = svg.viewBox.baseVal.height || svg.clientHeight;

  const dataUrl = await rasterizeSvg(svg, vbW, vbH, pixelRatio);

  const pageW = page?.width ?? vbW;
  const pageH = page?.height ?? vbH;

  const pdf = new jsPDF({
    orientation: pageW >= pageH ? "landscape" : "portrait",
    unit: "pt",
    format: [pageW, pageH],
    compress: true,
  });

  const imgAspect = vbW / vbH;
  const pageAspect = pageW / pageH;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  if (imgAspect > pageAspect) {
    drawW = pageW;
    drawH = pageW / imgAspect;
    drawX = 0;
    drawY = (pageH - drawH) / 2;
  } else {
    drawH = pageH;
    drawW = pageH * imgAspect;
    drawX = (pageW - drawW) / 2;
    drawY = 0;
  }

  pdf.addImage(dataUrl, "PNG", drawX, drawY, drawW, drawH);
  pdf.save(filename);
}

/** @deprecated Alias retained for older callers. */
export const exportNodeToPngPdf = exportSvgToPdf;
