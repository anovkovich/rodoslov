"use client";

import { useRef, useState } from "react";
import Header from "@/components/ui/Header";
import UnlockedGuard from "@/components/auth/UnlockedGuard";
import FlatTreeView, {
  type FlatTreeHandle,
} from "@/components/tree/FlatTreeView";
import CircularTreeView, {
  type CircularTreeHandle,
} from "@/components/tree/CircularTreeView";
import DecorativeTreeView, {
  type DecorativeTreeHandle,
} from "@/components/tree/DecorativeTreeView";
import ExportToolbar from "@/components/tree/ExportToolbar";
import { useTreeStore } from "@/lib/tree/store";
import Link from "next/link";

type Tab = "flat" | "circular" | "decorative";

export default function ViewPage() {
  return (
    <UnlockedGuard>
      <ViewInner />
    </UnlockedGuard>
  );
}

function ViewInner() {
  const [tab, setTab] = useState<Tab>("decorative");
  const rootId = useTreeStore((s) => s.rootId);
  const flatRef = useRef<FlatTreeHandle>(null);
  const circularRef = useRef<CircularTreeHandle>(null);
  const decorativeRef = useRef<DecorativeTreeHandle>(null);

  const currentSvg = () => {
    if (tab === "decorative") return decorativeRef.current?.svg() ?? null;
    if (tab === "circular") return circularRef.current?.svg() ?? null;
    return flatRef.current?.svg() ?? null;
  };
  const currentContainer = () => {
    if (tab === "decorative") return decorativeRef.current?.container() ?? null;
    if (tab === "circular") return circularRef.current?.container() ?? null;
    return flatRef.current?.container() ?? null;
  };

  if (!rootId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="card bg-base-100 shadow max-w-md w-full">
            <div className="card-body items-center text-center gap-3">
              <div className="text-5xl">🌱</div>
              <h2 className="card-title">Prazno stablo</h2>
              <p className="text-base-content/70 text-sm">
                Prvo dodajte osnovnu osobu u editoru.
              </p>
              <Link href="/editor" className="btn btn-primary btn-sm">
                Otvori editor
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header showStatsAndSearch />

      <main className="flex-1 container mx-auto p-4 flex flex-col gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-3 gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div role="tablist" className="tabs tabs-boxed">
                <button
                  role="tab"
                  className={`tab ${tab === "decorative" ? "tab-active" : ""}`}
                  onClick={() => setTab("decorative")}
                >
                  Dekorativno
                </button>
                <button
                  role="tab"
                  className={`tab ${tab === "circular" ? "tab-active" : ""}`}
                  onClick={() => setTab("circular")}
                >
                  Kružno
                </button>
                <button
                  role="tab"
                  className={`tab ${tab === "flat" ? "tab-active" : ""}`}
                  onClick={() => setTab("flat")}
                >
                  Ravno
                </button>
              </div>

              <ExportToolbar
                filenameBase={`family-tree-${tab}`}
                getSvg={currentSvg}
                getContainer={currentContainer}
              />
            </div>

            <div
              className="rounded-lg bg-base-200/40 overflow-hidden"
              style={{ height: "calc(100vh - 200px)", minHeight: 500 }}
            >
              {tab === "decorative" ? (
                <DecorativeTreeView
                  ref={decorativeRef}
                  className="w-full h-full"
                />
              ) : tab === "circular" ? (
                <CircularTreeView
                  ref={circularRef}
                  size={1100}
                  className="w-full h-full"
                />
              ) : (
                <FlatTreeView ref={flatRef} className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
