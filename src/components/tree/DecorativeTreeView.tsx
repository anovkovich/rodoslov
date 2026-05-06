"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3-hierarchy";
import { useTreeStore } from "@/lib/tree/store";
import { buildHierarchy, type TreeDatum } from "@/lib/tree/hierarchy";

export interface DecorativeTreeHandle {
  svg: () => SVGSVGElement | null;
  container: () => HTMLDivElement | null;
}

interface Props {
  className?: string;
  enableZoom?: boolean;
  width?: number;
  height?: number;
}

type SliceNode = HierarchyRectangularNode<TreeDatum>;

// Landscape poster canvas — aspect ~1.30:1. Slightly taller than wide
// gives the fan more radial room so each ring can host longer names
// without crowding. Exports to A3/A2/A1 (1.41) get a small letterbox.
const DEFAULT_W = 1500;
const DEFAULT_H = 1150;

// 220° total sweep at top; 140° empty wedge at bottom for the family title.
const FAN_SPAN = (220 * Math.PI) / 180;
const FAN_OFFSET = -FAN_SPAN / 2;

// Ink palette — muted dark on white, print-friendly.
const INK = "#2a2520";
const INK_SOFT = "#6b6359";
const BG = "#ffffff";
const RING = "#c7bfb4";

// Label layout tuning. CHAR_W_RATIO is an empirical average glyph width as a
// fraction of font-size for italic serif (Cormorant Garamond) — close enough
// for fit decisions without a per-render canvas measure pass.
const LABEL_PADDING = 1;
// Narrow band — every label ends up between 10 and 14 px regardless of
// slice size, so short names in wide slices don't balloon and long names
// in narrow slices don't shrink to dust. Tradeoff: a few labels in
// pathologically narrow slices may slightly overflow vertically, which
// reads better than a 2× size mismatch across the chart.
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE_RADIAL = 14;
const MAX_FONT_SIZE_TANGENT = 13;
const CHAR_W_RATIO = 0.55;
// Effective glyph height as a fraction of font-size for italic serif.
// Used to relax the perpendicular-axis budget — most rings have plenty of
// radial room but a tight `arcLen`, and a strict `fs ≤ arcLen` rule was
// shrinking middle rings far below what fits visually.
const TEXT_HEIGHT_RATIO = 0.75;

const DecorativeTreeView = forwardRef<DecorativeTreeHandle, Props>(
  function DecorativeTreeView(
    { className, enableZoom = true, width = DEFAULT_W, height = DEFAULT_H },
    ref
  ) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const people = useTreeStore((s) => s.people);
    const rootId = useTreeStore((s) => s.rootId);

    useImperativeHandle(ref, () => ({
      svg: () => svgRef.current,
      container: () => wrapRef.current,
    }));

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;
      d3.select(svg).selectAll("*").remove();
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const root = buildHierarchy(people, rootId);
      if (!root || !rootId) return;

      // Resolve CSS variables to concrete font-family strings. font-family
      // as an SVG *attribute* (unlike CSS `style`) doesn't evaluate var(),
      // so the web fonts were silently falling back to Georgia/serif.
      const rootStyle = window.getComputedStyle(document.body);
      const cormorantVar = rootStyle
        .getPropertyValue("--font-cormorant")
        .trim();
      const greatVibesVar = rootStyle
        .getPropertyValue("--font-great-vibes")
        .trim();
      const serifFont = cormorantVar
        ? `${cormorantVar}, Georgia, serif`
        : "Georgia, serif";
      const cursiveFont = greatVibesVar
        ? `${greatVibesVar}, cursive`
        : "cursive";

      // Fan center is the SAME point as the tree center. Tree silhouette
      // sits inside the innerR circle; fan rings draw around it. innerR
      // matches the tree's radius so the first ring boundary hugs the tree.
      const cx = width / 2;
      // outerR is computed against a *provisional* cy so it stays stable
      // regardless of the vertical-centering shift below.
      const cyProvisional = height * 0.55;
      const outerR = Math.min(cx, cyProvisional) - 40;
      const innerR = 155;
      const fanDepth = outerR - innerR;

      // ---- Pre-compute title + bio so we can vertically center the whole
      //      composition (fan top edge → bio bottom) within the canvas. ----
      const rootPerson = rootId ? people[rootId] : null;
      const familyTitle = rootPerson?.familyName?.trim();
      const familyBio = rootPerson?.familyBio?.trim();
      const titleSize = 64;
      const bioFontSize = 17;
      const bioLineHeightEm = 1.35;
      const bioMaxWidth = outerR * 0.85;
      const bioLines = familyBio
        ? wrapTextToWidth(familyBio, bioFontSize, bioMaxWidth)
        : [];

      // Distances measured from cy. Top edge of content = -outerR.
      // Bottom edge depends on whether we render a bio block.
      const titleOffset = innerR + 60; // baseline of title relative to cy
      const titleHalfHeight = titleSize * 0.5;
      let contentBottomFromCy = titleOffset + titleHalfHeight;
      if (bioLines.length > 0) {
        const bioStart = titleOffset + titleSize * 0.45 + bioFontSize;
        const bioEnd =
          bioStart +
          (bioLines.length - 1) * bioFontSize * bioLineHeightEm +
          bioFontSize * 0.3;
        contentBottomFromCy = Math.max(contentBottomFromCy, bioEnd);
      }

      // Vertically center the content block with a minimum top padding.
      const minTopPadding = 40;
      const idealCy = (height - contentBottomFromCy + outerR) / 2;
      const cy = Math.max(outerR + minTopPadding, idealCy);

      root.count();
      root.sort((a, b) =>
        (a.data.person.firstName || "").localeCompare(
          b.data.person.firstName || ""
        )
      );

      const partition = d3.partition<TreeDatum>().size([FAN_SPAN, fanDepth]);
      const laid = partition(root) as SliceNode;

      // d3.partition reserves the inner slice for the root (level 0) even
      // though we don't draw it. Rescale y so level 1..height fill the full
      // radial range [innerR, outerR] with no empty inner band.
      const heightVal = Math.max(1, root.height);
      const partitionStep = fanDepth / (heightVal + 1);
      const scaleY = (heightVal + 1) / heightVal;
      const mapY = (y: number) => Math.max(0, (y - partitionStep) * scaleY);
      const ringStep = fanDepth / heightVal;

      const zoomLayer = d3.select(svg).append("g").attr("class", "zoom-layer");

      // Solid white background.
      zoomLayer
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", BG);

      // ---- Fan ----
      const fan = zoomLayer
        .append("g")
        .attr("class", "fan")
        .attr("transform", `translate(${cx},${cy})`);

      // Ring guides — drawn as plain SVG arc paths (d3.arc with zero
      // thickness can return degenerate output, so we build the path string
      // by hand to guarantee each ring renders).
      const ringArc = (r: number) => {
        const startA = FAN_OFFSET;
        const endA = FAN_OFFSET + FAN_SPAN;
        const x1 = Math.sin(startA) * r;
        const y1 = -Math.cos(startA) * r;
        const x2 = Math.sin(endA) * r;
        const y2 = -Math.cos(endA) * r;
        const largeArc = FAN_SPAN > Math.PI ? 1 : 0;
        return `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2}`;
      };

      // Skip only the ring at innerR (tree edge is that boundary). Every
      // depth-to-depth boundary (including depth-1 → depth-2) gets drawn.
      for (let i = 1; i <= heightVal; i++) {
        fan.append("path")
          .attr("d", ringArc(innerR + i * ringStep))
          .attr("fill", "none")
          .attr("stroke", RING)
          .attr("stroke-width", 0.7);
      }

      const slices = laid.descendants().filter((d) => d.depth > 0);

      // Radial separators — one line per unique angular boundary. Each line
      // starts at the SHALLOWEST depth where the boundary exists and extends
      // to outerR. That way a depth-3 boundary (e.g. between two tests)
      // only splits the depth-3 ring onward, not the ancestor cells above it.
      const shallowestDepth = new Map<number, number>();
      const recordBoundary = (x: number, depth: number) => {
        const current = shallowestDepth.get(x);
        if (current === undefined || depth < current) {
          shallowestDepth.set(x, depth);
        }
      };
      for (const d of slices) {
        recordBoundary(d.x0, d.depth);
        recordBoundary(d.x1, d.depth);
      }

      type Edge = { theta: number; rIn: number; key: string };
      const edges: Edge[] = Array.from(shallowestDepth.entries()).map(
        ([x, depth]) => ({
          theta: x + FAN_OFFSET,
          rIn: innerR + (depth - 1) * ringStep,
          key: `x:${x.toFixed(6)}`,
        })
      );

      fan.append("g")
        .attr("class", "radial-grid")
        .selectAll<SVGLineElement, Edge>("line")
        .data(edges, (e) => e.key)
        .join("line")
        .attr("x1", (e) => Math.sin(e.theta) * e.rIn)
        .attr("y1", (e) => -Math.cos(e.theta) * e.rIn)
        .attr("x2", (e) => Math.sin(e.theta) * outerR)
        .attr("y2", (e) => -Math.cos(e.theta) * outerR)
        .attr("stroke", INK)
        .attr("stroke-width", 0.6);

      // Italic serif labels — single line, auto-fit font size, adaptive
      // orientation. No wrap, no truncation; overflow is preferred over
      // sliced names.
      const labelGroup = fan
        .append("g")
        .attr("class", "labels")
        .attr("text-anchor", "middle")
        .attr("fill", INK)
        .attr("font-family", serifFont)
        .attr("font-style", "italic")
        .attr("font-weight", 500);

      labelGroup
        .selectAll<SVGTextElement, SliceNode>("text")
        .data(slices, (d) => d.data.person.id)
        .join("text")
        .attr("dy", "0.35em")
        .each(function (d) {
          const layout = planLabel(d, innerR, mapY);
          d3.select(this)
            .attr("transform", layout.transform)
            .attr("font-size", layout.fontSize)
            .text(layout.lines[0]);
        });

      // ---- Tree silhouette AT THE FAN CENTER ----
      // Size matched to 2 × innerR so the silhouette's radius exactly meets
      // the first ring boundary — no visible gap between tree and rings.
      const treeSize = innerR * 2;
      const treeCenterY = cy;
      const treeX = cx - treeSize / 2;
      const treeY = treeCenterY - treeSize / 2;

      // Resolve tree.png against the configured basePath so the asset works
      // under GitHub Pages (which serves the site at /rodoslov/).
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      zoomLayer
        .append("image")
        .attr("href", `${basePath}/images/tree.png`)
        .attr("x", treeX)
        .attr("y", treeY)
        .attr("width", treeSize)
        .attr("height", treeSize)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // ---- Root person name: single line in the tree's white seam strip ----
      if (rootPerson) {
        const fullName =
          [rootPerson.firstName, rootPerson.lastName]
            .filter((x): x is string => Boolean(x))
            .join(" ") || "—";

        zoomLayer
          .append("text")
          .attr("class", "root-name")
          .attr("x", cx)
          .attr("y", treeCenterY + treeSize * 0.13)
          .attr("text-anchor", "middle")
          .attr("fill", INK)
          .attr("font-family", serifFont)
          .attr("font-style", "italic")
          .attr("font-weight", 600)
          .attr("font-size", 28)
          .text(fullName);
      }

      // ---- Family title (cursive) hugging the tree roots ----
      // titleSize, titleOffset, bioLines were computed at the top of this
      // effect for the vertical-centering pass.
      const titleY = cy + titleOffset;
      if (familyTitle) {
        zoomLayer
          .append("text")
          .attr("x", cx)
          .attr("y", titleY)
          .attr("text-anchor", "middle")
          .attr("fill", INK)
          .attr("font-family", cursiveFont)
          .attr("font-size", titleSize)
          .text(familyTitle);
      }

      // ---- Family bio (italic, smaller) centered below the title ----
      if (bioLines.length > 0) {
        const bioStartY = titleY + titleSize * 0.45 + bioFontSize;
        const bioText = zoomLayer
          .append("text")
          .attr("class", "family-bio")
          .attr("text-anchor", "middle")
          .attr("fill", INK_SOFT)
          .attr("font-family", serifFont)
          .attr("font-style", "italic")
          .attr("font-size", bioFontSize)
          .attr("x", cx)
          .attr("y", bioStartY);
        bioLines.forEach((line, i) => {
          bioText
            .append("tspan")
            .attr("x", cx)
            .attr("dy", i === 0 ? 0 : `${bioLineHeightEm}em`)
            .text(line);
        });
      }

      // ---- Bottom-corner credits ----
      const cornerFontSize = 16;
      const cornerPadding = 45;
      const posterSource = rootPerson?.posterSource?.trim();
      const posterDesigner = rootPerson?.posterDesigner?.trim();
      if (posterDesigner) {
        zoomLayer
          .append("text")
          .attr("class", "poster-designer")
          .attr("x", cornerPadding)
          .attr("y", height - cornerPadding)
          .attr("text-anchor", "start")
          .attr("fill", INK_SOFT)
          .attr("font-family", serifFont)
          .attr("font-style", "italic")
          .attr("font-size", cornerFontSize)
          .text(posterDesigner);
      }
      if (posterSource) {
        zoomLayer
          .append("text")
          .attr("class", "poster-source")
          .attr("x", width - cornerPadding)
          .attr("y", height - cornerPadding)
          .attr("text-anchor", "end")
          .attr("fill", INK_SOFT)
          .attr("font-family", serifFont)
          .attr("font-style", "italic")
          .attr("font-size", cornerFontSize)
          .text(posterSource);
      }

      // Pan/zoom for exploration. Export still grabs the whole SVG clean.
      if (enableZoom) {
        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.3, 5])
          .on("zoom", (event) => {
            zoomLayer.attr("transform", event.transform.toString());
          });
        d3.select<SVGSVGElement, unknown>(svg).call(zoom);
      }
    }, [people, rootId, width, height, enableZoom]);

    return (
      <div ref={wrapRef} className={className}>
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
    );
  }
);

interface LabelLayout {
  fontSize: number;
  lines: string[];
  transform: string;
}

/** Word-wrap text to a max pixel width, splitting on whitespace. Falls back
 *  to a hard character split if a single word is wider than the budget. */
function wrapTextToWidth(
  text: string,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const charW = fontSize * CHAR_W_RATIO;
  const maxChars = Math.max(1, Math.floor(maxWidth / charW));
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length <= maxChars) {
      current = tentative;
      continue;
    }
    if (current) lines.push(current);
    if (word.length <= maxChars) {
      current = word;
    } else {
      // Single word too long — hard-break it across lines.
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface SliceBudget {
  lengthBudget: number;
  heightBudget: number;
  midDisplay: number;
  midRadius: number;
  useTangential: boolean;
}

function sliceBudget(
  d: SliceNode,
  innerR: number,
  mapY: (y: number) => number
): SliceBudget {
  const midDisplay = (d.x0 + d.x1) / 2 + FAN_OFFSET;
  const midRadius = innerR + (mapY(d.y0) + mapY(d.y1)) / 2;
  const arcLen = (d.x1 - d.x0) * midRadius;
  const radial = mapY(d.y1) - mapY(d.y0);
  const useTangential = d.depth <= 2;
  return {
    midDisplay,
    midRadius,
    useTangential,
    lengthBudget: Math.max(1, (useTangential ? arcLen : radial) - LABEL_PADDING),
    heightBudget: Math.max(1, (useTangential ? radial : arcLen) - LABEL_PADDING),
  };
}

/** Largest single-line font ≤ maxFs that fits this slice's budget. */
function fitSingleLineFontSize(
  name: string,
  budget: SliceBudget,
  maxFs: number
): number {
  for (let fs = maxFs; fs >= MIN_FONT_SIZE; fs--) {
    const w = name.length * fs * CHAR_W_RATIO;
    if (
      w <= budget.lengthBudget &&
      fs * TEXT_HEIGHT_RATIO <= budget.heightBudget
    ) {
      return fs;
    }
  }
  return MIN_FONT_SIZE;
}

/**
 * Per-slice label layout: pick the largest font that fits single-line.
 * If even MIN_FONT_SIZE doesn't fit, accept the overflow rather than
 * wrapping or truncating — names must remain readable.
 */
function planLabel(
  d: SliceNode,
  innerR: number,
  mapY: (y: number) => number
): LabelLayout {
  const budget = sliceBudget(d, innerR, mapY);
  const name = (d.data.person.firstName || "—").trim();
  const maxFs = budget.useTangential
    ? MAX_FONT_SIZE_TANGENT
    : MAX_FONT_SIZE_RADIAL;

  const fontSize = fitSingleLineFontSize(name, budget, maxFs);

  const deg = (budget.midDisplay * 180) / Math.PI - 90;
  const normalized = ((deg % 360) + 360) % 360;
  const flip = normalized > 90 && normalized < 270 ? 180 : 0;
  const tangentialOffset = budget.useTangential ? (flip === 0 ? 90 : -90) : 0;
  const transform = `rotate(${deg}) translate(${budget.midRadius},0) rotate(${flip + tangentialOffset})`;

  return { fontSize, lines: [name], transform };
}

export default DecorativeTreeView;
