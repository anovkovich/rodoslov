"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Person, TreeSnapshot } from "./types";

interface TreeState {
  rootId: string | null;
  people: Record<string, Person>;

  addRoot: (input: Omit<Person, "id" | "parentId">) => string;
  addChild: (parentId: string, input: Omit<Person, "id" | "parentId">) => string;
  addPartner: (
    personId: string,
    input: Omit<Person, "id" | "parentId" | "partnerId">
  ) => string;
  updatePerson: (id: string, patch: Partial<Omit<Person, "id">>) => void;
  removePerson: (id: string) => void;
  reset: () => void;
  importSnapshot: (snap: TreeSnapshot) => void;
  exportSnapshot: () => TreeSnapshot;
}

export const useTreeStore = create<TreeState>()((set, get) => ({
  rootId: null,
  people: {},

  addRoot: (input) => {
    const id = uuid();
    const person: Person = { id, parentId: null, ...input };
    set({ rootId: id, people: { [id]: person } });
    return id;
  },

  addChild: (parentId, input) => {
    const id = uuid();
    const person: Person = { id, parentId, ...input };
    set((s) => ({ people: { ...s.people, [id]: person } }));
    return id;
  },

  addPartner: (personId, input) => {
    const id = uuid();
    const target = get().people[personId];
    if (!target) throw new Error(`Person ${personId} not found`);
    const partner: Person = {
      id,
      parentId: null,
      partnerId: personId,
      ...input,
    };
    set((s) => ({
      people: {
        ...s.people,
        [id]: partner,
        [personId]: { ...target, partnerId: id },
      },
    }));
    return id;
  },

  updatePerson: (id, patch) => {
    set((s) => {
      const current = s.people[id];
      if (!current) return s;
      return { people: { ...s.people, [id]: { ...current, ...patch } } };
    });
  },

  removePerson: (id) => {
    set((s) => {
      const next: Record<string, Person> = {};
      for (const p of Object.values(s.people)) {
        if (p.id === id) continue;
        next[p.id] = {
          ...p,
          parentId: p.parentId === id ? null : p.parentId,
          partnerId: p.partnerId === id ? null : p.partnerId,
        };
      }
      return {
        people: next,
        rootId: s.rootId === id ? null : s.rootId,
      };
    });
  },

  reset: () => set({ rootId: null, people: {} }),

  importSnapshot: (snap) =>
    set({ rootId: snap.rootId, people: snap.people }),

  exportSnapshot: () => ({
    version: 1,
    rootId: get().rootId,
    people: get().people,
    updatedAt: new Date().toISOString(),
  }),
}));
