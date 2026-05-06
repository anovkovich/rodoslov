export type Gender = "M" | "F" | "O";

export interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  birthYear?: number;
  deathYear?: number;
  gender?: Gender;
  /** Single parent — enforces the "only one node can be parent" rule. */
  parentId: string | null;
  /** Optional spouse/partner — bidirectional link. */
  partnerId?: string | null;
  notes?: string;
  /** Only meaningful on the root — family name printed on decorative poster. */
  familyName?: string;
  /** Only meaningful on the root — short family history shown under the
   *  family title on the decorative poster. */
  familyBio?: string;
  /** Only meaningful on the root — credit printed in the bottom-LEFT corner
   *  of the decorative poster (e.g. who compiled the source records). */
  posterSource?: string;
  /** Only meaningful on the root — credit printed in the bottom-RIGHT corner
   *  of the decorative poster (e.g. who designed the poster). */
  posterDesigner?: string;
}

export interface TreeSnapshot {
  version: 1;
  rootId: string | null;
  people: Record<string, Person>;
  updatedAt: string;
}

export type ViewMode = "flat" | "circular";

/** Public metadata for a tree — listed on the landing without a password. */
export interface TreeMeta {
  id: string;
  name: string;
  /** Optional display hint (e.g. root person's name) shown in the listing. */
  rootHint?: string;
  /** Cached count for the listing — refreshed on every save. */
  personCount?: number;
  /** PBKDF2 salt for deriving the AES key from the user's password. */
  kdfSalt: string;
  /** AES-GCM ciphertext of a fixed plaintext — used to verify the password
   *  before attempting to decrypt the snapshot. */
  kcv: string;
  createdAt: string;
  updatedAt: string;
}

export type TreeRegistry = Record<string, TreeMeta>;
