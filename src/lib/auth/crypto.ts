import type { TreeSnapshot } from "@/lib/tree/types";

const PBKDF2_ITERATIONS = 200_000;
const KCV_PLAINTEXT = "fam-tree-kcv-v2";
const IV_BYTES = 12;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// WebCrypto rejects Uint8Array views over SharedArrayBuffer at the type level
// in strict TS. Copy into a fresh plain ArrayBuffer so the type is unambiguous.
function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

export function randomSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export async function deriveKey(
  password: string,
  kdfSaltHex: string
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    asBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBuffer(fromHex(kdfSaltHex)),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptString(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(new TextEncoder().encode(plaintext))
  );
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return toBase64(combined);
}

async function decryptString(blob: string, key: CryptoKey): Promise<string> {
  const combined = fromBase64(blob);
  const iv = combined.subarray(0, IV_BYTES);
  const ct = combined.subarray(IV_BYTES);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(ct)
  );
  return new TextDecoder().decode(pt);
}

export async function encryptSnapshot(
  snap: TreeSnapshot,
  key: CryptoKey
): Promise<string> {
  return encryptString(JSON.stringify(snap), key);
}

export async function decryptSnapshot(
  blob: string,
  key: CryptoKey
): Promise<TreeSnapshot> {
  const json = await decryptString(blob, key);
  return JSON.parse(json) as TreeSnapshot;
}

/** Encrypt a fixed plaintext as a "key check value" — verifies password without
 * needing to decrypt the (potentially large) snapshot. */
export async function makeKcv(key: CryptoKey): Promise<string> {
  return encryptString(KCV_PLAINTEXT, key);
}

export async function verifyKcv(blob: string, key: CryptoKey): Promise<boolean> {
  try {
    const pt = await decryptString(blob, key);
    return pt === KCV_PLAINTEXT;
  } catch {
    return false;
  }
}
