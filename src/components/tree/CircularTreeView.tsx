"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3-hierarchy";
import { useTreeStore } from "@/lib/tree/store";
import {
  buildHierarchy,
  inheritsFemaleTint,
  type TreeDatum,
} from "@/lib/tree/hierarchy";
import { PALETTE, personColor } from "./palette";
import type { Person } from "@/lib/tree/types";

export interface CircularTreeHandle {
  svg: () => SVGSVGElement | null;
  container: () => HTMLDivElement | null;
}

interface Props {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onBackgroundClick?: () => void;
  size?: number;
  className?: string;
  enableZoom?: boolean;
}

type SliceNode = HierarchyRectangularNode<TreeDatum>;

const CircularTreeView = forwardRef<CircularTreeHandle, Props>(
  function CircularTreeView(
    {
      selectedId,
      onSelect,
      onBackgroundClick,
      size = 1000,
      className,
      enableZoom = true,
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
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        return;
      }

      const cx = size / 2;
      const cy = size / 2;
      const outerPad = 20;
      const outerRadius = size / 2 - outerPad;

      root.count();
      root.sort((a, b) => {
        const an = a.data.person.firstName || "";
        const bn = b.data.person.firstName || "";
        return an.localeCompare(bn);
      });

      const partition = d3.partition<TreeDatum>().size([2 * Math.PI, outerRadius]);
      const laid = partition(root) as SliceNode;

      const depth = root.height + 1;
      const ringStep = outerRadius / depth;

      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

      const zoomLayer = d3.select(svg).append("g").attr("class", "zoom-layer");
      const g = zoomLayer
        .append("g")
        .attr("class", "content")
        .attr("transform", `translate(${cx},${cy})`);

      // Concentric grid rings — root's own stroke covers r=ringStep.
      for (let i = 2; i <= depth; i++) {
        g.append("circle")
          .attr("r", i * ringStep)
          .attr("fill", "none")
          .attr("stroke", PALETTE.ringLight)
          .attr("stroke-width", 0.8);
      }

      // One slice per hierarchy node (couples stay together).
      const slices = laid.descendants().filter((d) => d.depth > 0);

      const arc = d3
        .arc<SliceNode>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .innerRadius((d) => d.y0)
        .outerRadius((d) => d.y1)
        .padAngle(0.0015)
        .padRadius(outerRadius);

      const isFemaleLine = (d: SliceNode) =>
        inheritsFemaleTint(people, d.data.person.id);

      g.append("g")
        .attr("class", "slices")
        .selectAll<SVGPathElement, SliceNode>("path.slice")
        .data(slices, (d) => d.data.person.id)
        .join("path")
        .attr("class", "slice")
        .attr("d", (d) => arc(d) ?? "")
        .attr("fill", (d) => personColor(d.data.person))
        .attr("fill-opacity", 0.9)
        .attr("stroke", (d) =>
          d.data.person.id === selectedId
            ? PALETTE.accent
            : isFemaleLine(d)
              ? PALETTE.femaleLineageBorder
              : PALETTE.ringDark
        )
        .attr("stroke-width", (d) =>
          d.data.person.id === selectedId ? 2 : isFemaleLine(d) ? 1.2 : 0.6
        )
        .style("cursor", onSelect ? "pointer" : "default")
        .on("click", (event, d) => {
          if (!onSelect) return;
          event.stopPropagation();
          onSelect(d.data.person.id);
        });

      // Radial separators between sibling slices.
      g.append("g")
        .attr("class", "grid-radial")
        .selectAll<SVGLineElement, SliceNode>("line")
        .data(slices)
        .join("line")
        .each(function (d) {
          const a = d.x0 - Math.PI / 2;
          d3.select(this)
            .attr("x1", Math.cos(a) * d.y0)
            .attr("y1", Math.sin(a) * d.y0)
            .attr("x2", Math.cos(a) * d.y1)
            .attr("y2", Math.sin(a) * d.y1)
            .attr("stroke", PALETTE.ringDark)
            .attr("stroke-width", 0.5);
        });

      const baseFont = (d: SliceNode) => {
        const ring = Math.round(d.y0 / ringStep);
        return Math.max(14, 24 - ring * 2);
      };

      // Labels — one centered label; couples use a single <text> with two <tspan>
      // lines so the partner name sits on its own line (proper <br/> equivalent).
      g.append("g")
        .attr("class", "labels")
        .selectAll<SVGGElement, SliceNode>("g.label")
        .data(slices, (d) => d.data.person.id)
        .join("g")
        .attr("class", "label")
        .each(function (d) {
          const g2 = d3.select(this);
          const { person, partner } = d.data;
          const fs = baseFont(d);
          const midAngle = (d.x0 + d.x1) / 2;
          const deg = (midAngle * 180) / Math.PI - 90;
          const flip = deg > 90 && deg < 270 ? 180 : 0;
          const rMid = (d.y0 + d.y1) / 2;

          const t = g2
            .append("text")
            .attr(
              "transform",
              `rotate(${deg}) translate(${rMid},0) rotate(${flip})`
            )
            .attr("text-anchor", "middle")
            .attr("fill", PALETTE.text)
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("font-weight", 500)
            .attr("font-size", fs)
            .attr("pointer-events", "none");

          const charW = fs * 0.55;
          const arcLen = (d.x1 - d.x0) * rMid;
          const radial = d.y1 - d.y0;
          const usable = Math.max(arcLen, radial) - 8;
          const maxChars = Math.max(1, Math.floor(usable / charW));

          if (partner) {
            t.append("tspan")
              .attr("x", 0)
              .attr("dy", "-0.55em")
              .text(truncateStr(personName(person), maxChars));
            t.append("tspan")
              .attr("x", 0)
              .attr("dy", "1.15em")
              .attr("fill", PALETTE.textMuted)
              .attr("font-size", Math.round(fs * 0.9))
              .text(truncateStr(personName(partner), maxChars));
          } else {
            t.attr("dy", "0.35em").text(
              truncateStr(personName(person), maxChars)
            );
          }
        });

      // Root central disk — couple stacked vertically when partner exists.
      const rootPerson = people[rootId!];
      const rootPartner = rootPerson?.partnerId
        ? people[rootPerson.partnerId]
        : undefined;

      if (rootPerson) {
        const rootG = g.append("g").attr("class", "root-center");

        const rootFemaleLine = inheritsFemaleTint(people, rootPerson.id);

        rootG
          .append("circle")
          .attr("r", ringStep)
          .attr("fill", personColor(rootPerson))
          .attr("fill-opacity", 0.95)
          .attr(
            "stroke",
            rootPerson.id === selectedId
              ? PALETTE.accent
              : rootFemaleLine
                ? PALETTE.femaleLineageBorder
                : PALETTE.ringDark
          )
          .attr(
            "stroke-width",
            rootPerson.id === selectedId ? 2.5 : rootFemaleLine ? 1.4 : 0.8
          )
          .style("cursor", onSelect ? "pointer" : "default")
          .on("click", (event) => {
            if (!onSelect) return;
            event.stopPropagation();
            onSelect(rootPerson.id);
          });

        if (rootPartner) {
          const t = rootG
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", PALETTE.text)
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("font-weight", 500);

          t.append("tspan")
            .attr("x", 0)
            .attr("dy", "-0.3em")
            .attr("font-size", 22)
            .text(truncateStr(personName(rootPerson), 18));

          t.append("tspan")
            .attr("x", 0)
            .attr("dy", "1.2em")
            .attr("font-size", 20)
            .attr("fill", PALETTE.textMuted)
            .text(truncateStr(personName(rootPartner), 18));
        } else {
          const t = rootG
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", PALETTE.text)
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("font-weight", 500);

          const hasLastName = Boolean(rootPerson.lastName);

          t.append("tspan")
            .attr("x", 0)
            .attr("dy", hasLastName ? "-0.3em" : "0.35em")
            .attr("font-size", 26)
            .text(truncateStr(rootPerson.firstName || "—", 18));

          if (hasLastName) {
            t.append("tspan")
              .attr("x", 0)
              .attr("dy", "1.2em")
              .attr("font-size", 22)
              .text(truncateStr(rootPerson.lastName!, 18));
          }

          const years = [rootPerson.birthYear, rootPerson.deathYear]
            .filter(Boolean)
            .join("–");
          if (years) {
            rootG
              .append("text")
              .attr("text-anchor", "middle")
              .attr("dy", hasLastName ? "44" : "26")
              .attr("fill", PALETTE.textMuted)
              .attr("font-family", "system-ui, -apple-system, sans-serif")
              .attr("font-size", 15)
              .text(years);
          }
        }
      }

      if (enableZoom) {
        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.3, 5])
          .on("zoom", (event) => {
            zoomLayer.attr("transform", event.transform.toString());
          });
        d3.select<SVGSVGElement, unknown>(svg).call(zoom);
      }
    }, [people, rootId, selectedId, onSelect, size, enableZoom]);

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
  }
);

function personName(p: Person) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

function truncateStr(s: string, max: number) {
  if (max <= 0) return "";
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + "…" : s;
}

export default CircularTreeView;
