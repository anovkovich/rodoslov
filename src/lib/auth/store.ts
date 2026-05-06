"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTreeStore } from "@/lib/tree/store";
import {
  createTree,
  deleteTree as registryDelete,
  findTree,
  loadDecryptedSnapshot,
  saveEncryptedSnapshot,
  touchTree,
  verifyTreePassword,
} from "@/lib/tree/registry";

// In-memory only — never persisted, never crosses a reload.
let cryptoKey: CryptoKey | null = null;
let saveUnsub: (() => void) | null = null;
let saveTimer: number | null = null;

function stopAutosave() {
  if (saveUnsub) {
    saveUnsub();
    saveUnsub = null;
  }
  if (saveTimer != null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function startAutosave(treeId: string, key: CryptoKey) {
  stopAutosave();
  saveUnsub = useTreeStore.subscribe(() => {
    if (saveTimer != null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        const snap = useTreeStore.getState().exportSnapshot();
        await saveEncryptedSnapshot(treeId, snap, key);
        const root = snap.rootId ? snap.people[snap.rootId] : null;
        const rootHint = root
          ? [root.firstName, root.lastName].filter(Boolean).join(" ")
          : undefined;
        touchTree(treeId, {
          personCount: Object.keys(snap.people).length,
          rootHint,
        });
      } catch (err) {
        console.error("Encrypted save failed:", err);
      }
    }, 300);
  });
}

interface SessionState {
  unlockedTreeId: string | null;
  unlockedTreeName: string | null;
  /** True only when an in-memory CryptoKey is loaded. Survives no reload. */
  hasKey: boolean;
  hydrated: boolean;

  unlock: (id: string, password: string) => Promise<void>;
  createAndUnlock: (
    name: string,
    password: string
  ) => Promise<{ id: string }>;
  lock: () => void;
  /** Update the unlocked tree's display name in the registry + session. */
  renameUnlocked: (newName: string) => void;
  /** Delete the unlocked tree and lock the session. */
  deleteUnlocked: () => void;
  markHydrated: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      unlockedTreeId: null,
      unlockedTreeName: null,
      hasKey: false,
      hydrated: false,

      unlock: async (id, password) => {
        const key = await verifyTreePassword(id, password);
        if (!key) throw new Error("Pogrešna lozinka.");
        const meta = findTree(id);
        if (!meta) throw new Error("Stablo više ne postoji.");
        const snap = await loadDecryptedSnapshot(id, key);
        useTreeStore.getState().importSnapshot(snap);
        cryptoKey = key;
        startAutosave(id, key);
        set({
          unlockedTreeId: id,
          unlockedTreeName: meta.name,
          hasKey: true,
        });
      },

      createAndUnlock: async (name, password) => {
        const { meta, key } = await createTree(name, password);
        useTreeStore.getState().reset();
        cryptoKey = key;
        startAutosave(meta.id, key);
        set({
          unlockedTreeId: meta.id,
          unlockedTreeName: meta.name,
          hasKey: true,
        });
        return { id: meta.id };
      },

      lock: () => {
        stopAutosave();
        useTreeStore.getState().reset();
        cryptoKey = null;
        set({
          unlockedTreeId: null,
          unlockedTreeName: null,
          hasKey: false,
        });
      },

      renameUnlocked: (newName) => {
        const id = get().unlockedTreeId;
        if (!id) return;
        const trimmed = newName.trim();
        touchTree(id, { name: trimmed });
        set({ unlockedTreeName: trimmed });
      },

      deleteUnlocked: () => {
        const id = get().unlockedTreeId;
        if (!id) return;
        stopAutosave();
        useTreeStore.getState().reset();
        cryptoKey = null;
        registryDelete(id);
        set({
          unlockedTreeId: null,
          unlockedTreeName: null,
          hasKey: false,
        });
      },

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "family-tree-session-v2",
      // hasKey is intentionally NOT persisted — it must be re-derived per session.
      partialize: (s) => ({
        unlockedTreeId: s.unlockedTreeId,
        unlockedTreeName: s.unlockedTreeName,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);
