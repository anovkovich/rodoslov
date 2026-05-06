"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { HierarchyPointNode } from "d3-hierarchy";
import { useTreeStore } from "@/lib/tree/store";
import {
  buildHierarchy,
  inheritsFemaleTint,
  type TreeDatum,
} from "@/lib/tree/hierarchy";
import { PALETTE, personBorder, personColor } from "./palette";
import type { Person } from "@/lib/tree/types";

const CELL_W = 180;
const CELL_H = 68;
const DX = 96;
const DY = 320;

export interface FlatTreeHandle {
  svg: () => SVGSVGElement | null;
  container: () => HTMLDivElement | null;
}

interface Props {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onBackgroundClick?: () => void;
  className?: string;
  enableZoom?: boolean;
  /** When true, viewBox tracks the selection (parent + self + children). */
  focusOnSelection?: boolean;
}

type Node = HierarchyPointNode<TreeDatum>;

const FlatTreeView = forwardRef<FlatTreeHandle, Props>(function FlatTreeView(
  {
    selectedId,
    onSelect,
    onBackgroundClick,
    className,
    enableZoom = true,
    focusOnSelection = false,
  },
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

    const root = buildHierarchy(people, rootId);
    if (!root) {
      svg.setAttribute("viewBox", "0 0 100 100");
      return;
    }

    const layout = d3.tree<TreeDatum>().nodeSize([DX, DY]);
    const laidOut = layout(root) as Node;

    const zoomLayer = d3.select(svg).append("g").attr("class", "zoom-layer");
    const contentG = zoomLayer.append("g").attr("class", "content");

    // Cubic Bezier from right edge of parent cell to left edge of child cell.
    const linkPath = (source: Node, target: Node) => {
      const sx = source.y + CELL_W;
      const sy = source.x;
      const tx = target.y;
      const ty = target.x;
      const mx = (sx + tx) / 2;
      return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
    };

    contentG
      .append("g")
      .attr("class", "links")
      .attr("fill", "none")
      .attr("stroke", PALETTE.link)
      .attr("stroke-width", 1.4)
      .attr("stroke-linecap", "round")
      .selectAll("path")
      .data(laidOut.links())
      .join("path")
      .attr("d", (l) => linkPath(l.source, l.target));

    const nodeG = contentG
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(laidOut.descendants(), (d) => d.data.person.id)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodeG.each(function (d) {
      const g = d3.select(this);
      const femaleLineage = inheritsFemaleTint(people, d.data.person.id);
      const fill = personColor(d.data.person);
      const border = femaleLineage
        ? PALETTE.femaleLineageBorder
        : personBorder(d.data.person);
      drawCell(
        g,
        d.data.person,
        d.data.partner,
        fill,
        border,
        selectedId,
        onSelect
      );
    });

    // --- viewBox: focus neighborhood vs full tree ---
    const descendants = laidOut.descendants();

    let focusNode: Node | undefined;
    if (focusOnSelection && selectedId) {
      focusNode = descendants.find(
        (n) =>
          n.data.person.id === selectedId ||
          n.data.partner?.id === selectedId
      );
    }

    const focusSet: Node[] = [];
    if (focusNode) {
      focusSet.push(focusNode);
      if (focusNode.parent) focusSet.push(focusNode.parent);
      if (focusNode.children) focusSet.push(...focusNode.children);
    } else {
      focusSet.push(...descendants);
    }

    let vbX0 = Infinity;
    let vbY0 = Infinity;
    let vbX1 = -Infinity;
    let vbY1 = -Infinity;
    for (const n of focusSet) {
      vbX0 = Math.min(vbX0, n.y);
      vbX1 = Math.max(vbX1, n.y + CELL_W);
      vbY0 = Math.min(vbY0, n.x - CELL_H / 2);
      vbY1 = Math.max(vbY1, n.x + CELL_H / 2);
    }
    const pad = 60;
    vbX0 -= pad;
    vbY0 -= pad;
    vbX1 += pad;
    vbY1 += pad;

    const MIN_VB_W = 800;
    const MIN_VB_H = 360;
    let vbW = vbX1 - vbX0;
    let vbH = vbY1 - vbY0;
    if (vbW < MIN_VB_W) {
      const extra = (MIN_VB_W - vbW) / 2;
      vbX0 -= extra;
      vbW = MIN_VB_W;
    }
    if (vbH < MIN_VB_H) {
      const extra = (MIN_VB_H - vbH) / 2;
      vbY0 -= extra;
      vbH = MIN_VB_H;
    }

    svg.setAttribute("viewBox", `${vbX0} ${vbY0} ${vbW} ${vbH}`);

    if (enableZoom) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => {
          zoomLayer.attr("transform", event.transform.toString());
        });
      d3.select<SVGSVGElement, unknown>(svg).call(zoom);
    }
  }, [people, rootId, selectedId, onSelect, enableZoom, focusOnSelection]);

  return (
    <div
      ref={wrapRef}
      className={className}
      onClick={onBackgroundClick}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
});

function drawCell(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  person: Person,
  partner: Person | undefined,
  fill: string,
  border: string,
  selectedId: string | null | undefined,
  onSelect?: (id: string) => void
) {
  const x = 0;
  const y = -CELL_H / 2;

  const g = parent
    .append("g")
    .attr("transform", `translate(${x},${y})`)
    .style("cursor", onSelect ? "pointer" : "default");

  if (onSelect) {
    g.on("click", (event) => {
      event.stopPropagation();
      onSelect(person.id);
    });
  }

  const selected = person.id === selectedId || partner?.id === selectedId;

  g.append("rect")
    .attr("width", CELL_W)
    .attr("height", CELL_H)
    .attr("rx", 10)
    .attr("ry", 10)
    .attr("fill", fill)
    .attr("stroke", selected ? PALETTE.accent : border)
    .attr("stroke-width", selected ? 3 : 1.6);

  const name = fullName(person);
  const years = yearsStr(person);

  if (partner) {
    const partnerNameStr = fullName(partner);

    g.append("text")
      .attr("x", CELL_W / 2)
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.text)
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .attr("font-size", 15)
      .attr("font-weight", 600)
      .text(truncate(name, 22));

    g.append("text")
      .attr("x", CELL_W / 2)
      .attr("y", 48)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.textMuted)
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .attr("font-size", 13)
      .attr("font-weight", 400)
      .text(truncate(partnerNameStr, 22));
  } else {
    g.append("text")
      .attr("x", CELL_W / 2)
      .attr("y", years ? 29 : 40)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.text)
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .attr("font-size", 15)
      .attr("font-weight", 600)
      .text(truncate(name, 22));

    if (years) {
      g.append("text")
        .attr("x", CELL_W / 2)
        .attr("y", 48)
        .attr("text-anchor", "middle")
        .attr("fill", PALETTE.textMuted)
        .attr("font-family", "system-ui, -apple-system, sans-serif")
        .attr("font-size", 12)
        .text(years);
    }
  }
}

function fullName(p: Person): string {
  const n = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return n || "—";
}

function yearsStr(p: Person): string {
  return [p.birthYear, p.deathYear].filter(Boolean).join("–");
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default FlatTreeView;
