import { v4 as uuid } from "uuid";
import {
  decryptSnapshot,
  deriveKey,
  encryptSnapshot,
  makeKcv,
  randomSalt,
  verifyKcv,
} from "@/lib/auth/crypto";
import type { TreeMeta, TreeRegistry, TreeSnapshot } from "./types";

const REGISTRY_KEY = "family-tree-registry-v2";
const TREE_DATA_PREFIX = "family-tree-data-v2:";

export function treeDataKey(id: string): string {
  return `${TREE_DATA_PREFIX}${id}`;
}

function readRegistry(): TreeRegistry {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TreeRegistry;
  } catch {
    return {};
  }
}

function writeRegistry(reg: TreeRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}

export function listTrees(): TreeMeta[] {
  return Object.values(readRegistry()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function findTree(id: string): TreeMeta | null {
  return readRegistry()[id] ?? null;
}

export function nameTaken(name: string, exceptId?: string): boolean {
  const target = name.trim().toLowerCase();
  return Object.values(readRegistry()).some(
    (t) => t.id !== exceptId && t.name.trim().toLowerCase() === target
  );
}

/** Create a new tree: derive key, build KCV, write meta + empty encrypted payload. */
export async function createTree(
  name: string,
  password: string
): Promise<{ meta: TreeMeta; key: CryptoKey }> {
  const id = uuid();
  const kdfSalt = randomSalt(16);
  const key = await deriveKey(password, kdfSalt);
  const kcv = await makeKcv(key);
  const now = new Date().toISOString();
  const meta: TreeMeta = {
    id,
    name: name.trim(),
    kdfSalt,
    kcv,
    createdAt: now,
    updatedAt: now,
    personCount: 0,
  };
  const reg = readRegistry();
  reg[id] = meta;
  writeRegistry(reg);
  const empty: TreeSnapshot = {
    version: 1,
    rootId: null,
    people: {},
    updatedAt: now,
  };
  const blob = await encryptSnapshot(empty, key);
  window.localStorage.setItem(treeDataKey(id), blob);
  return { meta, key };
}

/** Verify the password and return the derived key, or null on failure. */
export async function verifyTreePassword(
  id: string,
  password: string
): Promise<CryptoKey | null> {
  const meta = findTree(id);
  if (!meta) return null;
  const key = await deriveKey(password, meta.kdfSalt);
  const ok = await verifyKcv(meta.kcv, key);
  return ok ? key : null;
}

export async function loadDecryptedSnapshot(
  id: string,
  key: CryptoKey
): Promise<TreeSnapshot> {
  const blob = window.localStorage.getItem(treeDataKey(id));
  if (!blob) {
    return {
      version: 1,
      rootId: null,
      people: {},
      updatedAt: new Date().toISOString(),
    };
  }
  return decryptSnapshot(blob, key);
}

export async function saveEncryptedSnapshot(
  id: string,
  snap: TreeSnapshot,
  key: CryptoKey
): Promise<void> {
  const blob = await encryptSnapshot(snap, key);
  window.localStorage.setItem(treeDataKey(id), blob);
}

export function touchTree(
  id: string,
  patch: Partial<Pick<TreeMeta, "name" | "rootHint" | "personCount">>
): void {
  const reg = readRegistry();
  const meta = reg[id];
  if (!meta) return;
  reg[id] = {
    ...meta,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeRegistry(reg);
}

export function deleteTree(id: string): void {
  const reg = readRegistry();
  delete reg[id];
  writeRegistry(reg);
  window.localStorage.removeItem(treeDataKey(id));
}
