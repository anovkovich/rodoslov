"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/auth/store";
import type { TreeMeta } from "@/lib/tree/types";

interface Props {
  tree: TreeMeta;
  redirectTo: string;
}

export default function UnlockForm({ tree, redirectTo }: Props) {
  const router = useRouter();
  const unlock = useSessionStore((s) => s.unlock);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await unlock(tree.id, password);
      router.replace(redirectTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card bg-base-100 shadow-xl w-full max-w-sm"
    >
      <div className="card-body gap-4">
        <div className="text-center">
          <div className="text-3xl mb-1" aria-hidden>
            🔒
          </div>
          <h1 className="card-title text-2xl justify-center">{tree.name}</h1>
          {tree.rootHint && (
            <p className="text-sm text-base-content/60 mt-1">
              {tree.rootHint}
            </p>
          )}
        </div>

        {error && (
          <div className="alert alert-error py-2 text-sm">{error}</div>
        )}

        <label className="form-control">
          <span className="label-text mb-1">Lozinka stabla</span>
          <input
            type="password"
            className="input input-bordered"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>

        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={busy || password.length === 0}
        >
          {busy ? <span className="loading loading-spinner" /> : "Otključaj"}
        </button>

        <Link
          href="/"
          className="text-center text-sm link link-hover text-base-content/70"
        >
          ← Nazad na listu stabala
        </Link>
      </div>
    </form>
  );
}
