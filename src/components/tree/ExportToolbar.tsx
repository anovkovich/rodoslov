"use client";

import { useState } from "react";
import { exportSvgToPdf, exportSvgToPng } from "@/lib/tree/export";

type Format = "fit" | "A4" | "A3" | "A2" | "A1" | "A0" | "50x70";

// [width, height] in PDF points. All landscape (width > height) so the
// fan-style chart fits naturally. 50×70 cm = 70 cm wide × 50 cm tall.
const FORMATS: Record<Exclude<Format, "fit">, [number, number]> = {
  A4: [842, 595],
  A3: [1191, 842],
  A2: [1684, 1191],
  A1: [2384, 1684],
  A0: [3370, 2384],
  "50x70": [1984, 1417],
};

const FORMAT_LABEL: Record<Format, string> = {
  fit: "Fit",
  A4: "A4",
  A3: "A3",
  A2: "A2",
  A1: "A1",
  A0: "A0",
  "50x70": "50×70",
};

interface Props {
  getSvg: () => SVGSVGElement | null;
  getContainer?: () => HTMLElement | null;
  filenameBase: string;
}

export default function ExportToolbar({
  getSvg,
  getContainer,
  filenameBase,
}: Props) {
  const [format, setFormat] = useState<Format>("fit");
  const [busy, setBusy] = useState(false);

  const handlePdf = async () => {
    const svg = getSvg();
    if (!svg) {
      alert("Ništa za izvoz — stablo je prazno.");
      return;
    }
    setBusy(true);
    try {
      const pageDims =
        format === "fit"
          ? undefined
          : {
              width: FORMATS[format][0],
              height: FORMATS[format][1],
            };
      await exportSvgToPdf(svg, `${filenameBase}.pdf`, 4, pageDims);
    } catch (err) {
      console.error(err);
      alert(`Greška pri izvozu PDF-a: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePng = async () => {
    const svg = getSvg();
    if (!svg) {
      alert("Ništa za izvoz — stablo je prazno.");
      return;
    }
    setBusy(true);
    try {
      await exportSvgToPng(svg, `${filenameBase}.png`, 4);
    } catch (err) {
      console.error(err);
      alert(`Greška pri izvozu PNG-a: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="join">
        {(["fit", "A4", "A3", "A2", "A1", "A0", "50x70"] as Format[]).map(
          (f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-xs join-item ${
                format === f ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setFormat(f)}
            >
              {FORMAT_LABEL[f]}
            </button>
          )
        )}
      </div>
      <button
        className="btn btn-sm btn-primary"
        onClick={handlePng}
        disabled={busy}
      >
        {busy ? "…" : "Izvezi PNG"}
      </button>
      <button
        className="btn btn-sm btn-outline"
        onClick={handlePdf}
        disabled={busy}
      >
        {busy ? "…" : "Izvezi PDF"}
      </button>
    </div>
  );
}
