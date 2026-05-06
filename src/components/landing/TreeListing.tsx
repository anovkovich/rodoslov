"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTrees } from "@/lib/tree/registry";
import type { TreeMeta } from "@/lib/tree/types";

const REGISTRY_KEY = "family-tree-registry-v2";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sr-Latn-RS", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function TreeCard({ tree }: { tree: TreeMeta }) {
  return (
    <Link
      href={`/unlock?tree=${encodeURIComponent(tree.id)}`}
      className="card bg-base-100 shadow hover:shadow-lg border border-base-200 transition-shadow"
    >
      <div className="card-body gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="card-title break-all">{tree.name}</h2>
          <span className="text-2xl" aria-hidden>
            🔒
          </span>
        </div>
        {tree.rootHint && (
          <p className="text-sm text-base-content/70">{tree.rootHint}</p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-base-content/50">
          <span>
            {tree.personCount ?? 0} {tree.personCount === 1 ? "osoba" : "osoba"}
          </span>
          <span>Izmenjeno {formatDate(tree.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function NewTreeCard() {
  return (
    <Link
      href="/new"
      className="card bg-base-100 border-2 border-dashed border-base-300 hover:border-primary hover:bg-primary/5 transition-colors"
    >
      <div className="card-body items-center justify-center text-center gap-2 min-h-[140px]">
        <div className="text-4xl" aria-hidden>
          ➕
        </div>
        <span className="font-semibold">Novo stablo</span>
        <span className="text-xs text-base-content/60">
          Kreiraj sa nazivom i lozinkom
        </span>
      </div>
    </Link>
  );
}

export default function TreeListing() {
  const [trees, setTrees] = useState<TreeMeta[] | null>(null);

  useEffect(() => {
    setTrees(listTrees());
    const refresh = () => setTrees(listTrees());
    const onStorage = (e: StorageEvent) => {
      if (e.key === REGISTRY_KEY || e.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (trees === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="card bg-base-100 shadow max-w-md mx-auto w-full">
        <div className="card-body items-center text-center gap-3">
          <div className="text-5xl" aria-hidden>
            🌱
          </div>
          <h2 className="card-title">Još nema stabala</h2>
          <p className="text-sm text-base-content/70">
            Kreiraj prvo stablo. Dobijaš naziv koji svi mogu da vide i ličnu
            lozinku koja štiti sadržaj.
          </p>
          <Link href="/new" className="btn btn-primary mt-2">
            Kreiraj prvo stablo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trees.map((t) => (
        <TreeCard key={t.id} tree={t} />
      ))}
      <NewTreeCard />
    </div>
  );
}
