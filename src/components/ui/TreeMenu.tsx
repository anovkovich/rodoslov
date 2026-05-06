"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/auth/store";
import { useTreeStore } from "@/lib/tree/store";
import type { TreeSnapshot } from "@/lib/tree/types";

export default function TreeMenu() {
  const router = useRouter();
  const treeName = useSessionStore((s) => s.unlockedTreeName);
  const lock = useSessionStore((s) => s.lock);
  const renameUnlocked = useSessionStore((s) => s.renameUnlocked);
  const deleteUnlocked = useSessionStore((s) => s.deleteUnlocked);
  const exportSnapshot = useTreeStore((s) => s.exportSnapshot);
  const importSnapshot = useTreeStore((s) => s.importSnapshot);
  const reset = useTreeStore((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);

  const [renaming, setRenaming] = useState(false);
  const [pendingName, setPendingName] = useState("");

  if (!treeName) return null;

  const handleExport = () => {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = treeName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `family-tree-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snap = JSON.parse(text) as TreeSnapshot;
      if (snap.version !== 1 || !snap.people) {
        throw new Error("Neispravan format.");
      }
      if (!confirm("Uvoz će prepisati trenutno stablo. Nastaviti?")) return;
      importSnapshot(snap);
    } catch (err) {
      alert(`Greška pri uvozu: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleReset = () => {
    if (!confirm("Obrisati sve osobe iz ovog stabla? Ovo se ne može poništiti."))
      return;
    reset();
  };

  const handleLock = () => {
    lock();
    router.replace("/");
  };

  const handleRenameStart = () => {
    setPendingName(treeName);
    setRenaming(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pendingName.trim();
    if (trimmed.length < 2) return;
    renameUnlocked(trimmed);
    setRenaming(false);
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Obrisati stablo „${treeName}" zauvek? Ovo se ne može poništiti.`
      )
    )
      return;
    deleteUnlocked();
    router.replace("/");
  };

  const initial = treeName.charAt(0).toUpperCase();

  return (
    <>
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-ghost btn-sm flex items-center gap-2 pl-1 pr-2"
        >
          <div className="avatar placeholder">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-content text-sm font-semibold">
              <span>{initial}</span>
            </div>
          </div>
          <span className="font-medium text-sm hidden sm:inline max-w-[160px] truncate">
            {treeName}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3 h-3 opacity-60"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-50 w-60 p-2 shadow-lg border border-base-300 mt-2"
        >
          <li className="menu-title px-3 py-1">
            <span className="text-xs uppercase tracking-wide truncate">
              Otključano: {treeName}
            </span>
          </li>
          <li>
            <button type="button" onClick={handleRenameStart}>
              Preimenuj stablo
            </button>
          </li>
          <li>
            <button type="button" onClick={handleExport}>
              Izvezi JSON
            </button>
          </li>
          <li>
            <button type="button" onClick={() => fileRef.current?.click()}>
              Uvezi JSON
            </button>
          </li>
          <div className="divider my-1" />
          <li>
            <button
              type="button"
              onClick={handleReset}
              className="text-warning"
            >
              Resetuj sadržaj
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleDelete}
              className="text-error"
            >
              Obriši stablo
            </button>
          </li>
          <div className="divider my-1" />
          <li>
            <button type="button" onClick={handleLock}>
              Zaključaj
            </button>
          </li>
        </ul>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {renaming && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-3">Preimenuj stablo</h3>
            <form onSubmit={handleRenameSubmit} className="flex flex-col gap-3">
              <input
                className="input input-bordered"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                autoFocus
                required
                minLength={2}
                maxLength={40}
              />
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setRenaming(false)}
                >
                  Otkaži
                </button>
                <button type="submit" className="btn btn-primary">
                  Sačuvaj
                </button>
              </div>
            </form>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setRenaming(false)}
          />
        </div>
      )}
    </>
  );
}
