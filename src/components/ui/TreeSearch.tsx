"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTreeStore } from "@/lib/tree/store";

interface Props {
  onSelect: (id: string) => void;
}

export default function TreeSearch({ onSelect }: Props) {
  const people = useTreeStore((s) => s.people);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(people)
      .filter((p) => {
        const name = `${p.firstName} ${p.lastName ?? ""}`.toLowerCase();
        return name.includes(q);
      })
      .slice(0, 25);
  }, [people, query]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery("");
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Enter" && results.length === 1) {
      handleSelect(results[0].id);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-64">
      <input
        type="search"
        className="input input-sm input-bordered w-full"
        placeholder="Pretraga osoba…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
      />
      {open && query.trim() && (
        <ul className="absolute z-50 mt-1 w-full bg-base-100 rounded-box shadow-lg border border-base-300 max-h-80 overflow-auto p-1">
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-base-content/50">
              Nema rezultata.
            </li>
          )}
          {results.map((p) => {
            const name =
              [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
            const parent = p.parentId ? people[p.parentId] : undefined;
            const partner = p.partnerId ? people[p.partnerId] : undefined;
            const parentLabel = parent
              ? [parent.firstName, parent.lastName].filter(Boolean).join(" ")
              : partner
                ? `partner: ${[partner.firstName, partner.lastName].filter(Boolean).join(" ")}`
                : "(root)";
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded hover:bg-base-200"
                  onClick={() => handleSelect(p.id)}
                >
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-base-content/60 truncate">
                    {parent ? `dete od: ${parentLabel}` : parentLabel}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
