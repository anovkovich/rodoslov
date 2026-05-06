"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/ui/Header";
import UnlockedGuard from "@/components/auth/UnlockedGuard";
import NodeForm, { type FormMode } from "@/components/tree/NodeForm";
import FlatTreeView from "@/components/tree/FlatTreeView";
import EmptyState from "@/components/tree/EmptyState";
import { useTreeStore } from "@/lib/tree/store";

export default function EditorPage() {
  return (
    <UnlockedGuard>
      <EditorInner />
    </UnlockedGuard>
  );
}

function EditorInner() {
  const rootId = useTreeStore((s) => s.rootId);
  const [mode, setMode] = useState<FormMode>({ kind: "idle" });
  // Auto-select root only once; clicking background afterwards stays deselected.
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (rootId && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setMode({ kind: "edit", personId: rootId });
    }
  }, [rootId]);

  if (!rootId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            onCreate={() => setMode({ kind: "addRoot" })}
            showForm={mode.kind === "addRoot"}
            onCancel={() => setMode({ kind: "idle" })}
            onDone={() => setMode({ kind: "idle" })}
          />
        </main>
      </div>
    );
  }

  const selectedId =
    mode.kind === "edit"
      ? mode.personId
      : mode.kind === "addChild"
        ? mode.parentId
        : mode.kind === "addPartner"
          ? mode.personId
          : null;

  const showForm = mode.kind !== "idle";

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        onSelectPerson={(id) => setMode({ kind: "edit", personId: id })}
        showStatsAndSearch
      />
      <main
        className={
          showForm
            ? "flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4"
            : "flex-1 grid grid-cols-1 gap-4 p-4"
        }
      >
        <section className="card bg-base-100 shadow overflow-hidden h-[calc(100vh-140px)] min-h-[460px]">
          <div className="card-body p-3 h-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-base-content/70">
                Pregled (ravno)
              </h3>
              <span className="text-xs text-base-content/50">
                Skrol za zoom, prevuci za pomeranje
              </span>
            </div>
            <div className="flex-1 rounded-lg bg-base-200/40 overflow-hidden">
              <FlatTreeView
                selectedId={selectedId}
                onSelect={(id) => setMode({ kind: "edit", personId: id })}
                onBackgroundClick={() => setMode({ kind: "idle" })}
                className="w-full h-full"
                focusOnSelection
              />
            </div>
          </div>
        </section>

        {showForm && (
          <section className="card bg-base-100 shadow h-[calc(100vh-140px)] min-h-[460px] overflow-auto">
            <NodeForm
              mode={mode}
              onChange={setMode}
              onDone={(id) => setMode({ kind: "edit", personId: id })}
            />
          </section>
        )}
      </main>
    </div>
  );
}
