"use client";

import { useMemo } from "react";
import { useTreeStore } from "@/lib/tree/store";
import { buildHierarchy } from "@/lib/tree/hierarchy";

export default function TreeStats() {
  const people = useTreeStore((s) => s.people);
  const rootId = useTreeStore((s) => s.rootId);

  const stats = useMemo(() => {
    const count = Object.keys(people).length;
    const h = buildHierarchy(people, rootId);
    const generations = h ? h.height + 1 : 0;
    return { count, generations };
  }, [people, rootId]);

  if (stats.count === 0) return null;

  return (
    <div className="text-sm text-base-content/70 whitespace-nowrap flex items-center gap-1">
      <span className="font-semibold text-base-content">{stats.count}</span>
      <span>osoba</span>
      <span className="text-base-content/40">·</span>
      <span className="font-semibold text-base-content">
        {stats.generations}
      </span>
      <span>kolena</span>
    </div>
  );
}
