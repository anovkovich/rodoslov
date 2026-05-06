"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/auth/store";
import { nameTaken } from "@/lib/tree/registry";

const NAME_RE = /^[\p{L}\p{N} '._-]{2,40}$/u;

export default function CreateTreeForm() {
  const router = useRouter();
  const createAndUnlock = useSessionStore((s) => s.createAndUnlock);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!NAME_RE.test(trimmed)) {
      setError("Naziv: 2–40 znaka (slova, brojevi, razmak, ' . _ -).");
      return;
    }
    if (nameTaken(trimmed)) {
      setError("Već postoji stablo sa istim nazivom na ovom uređaju.");
      return;
    }
    if (password.length < 6) {
      setError("Lozinka mora imati najmanje 6 znakova.");
      return;
    }
    if (password !== confirm) {
      setError("Lozinke se ne poklapaju.");
      return;
    }

    setBusy(true);
    try {
      await createAndUnlock(trimmed, password);
      router.replace("/editor");
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
            🌱
          </div>
          <h1 className="card-title text-2xl justify-center">Novo stablo</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Naziv je javan, lozinka štiti sadržaj.
          </p>
        </div>

        {error && (
          <div className="alert alert-error py-2 text-sm">{error}</div>
        )}

        <label className="form-control">
          <span className="label-text mb-1">Naziv stabla</span>
          <input
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="npr. Petrović"
            required
            autoFocus
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Lozinka</span>
          <input
            type="password"
            className="input input-bordered"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Potvrdi lozinku</span>
          <input
            type="password"
            className="input input-bordered"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <div className="alert alert-warning py-2 text-xs">
          ⚠ Bez lozinke nema oporavka. Sadržaj je šifrovan i niko (ni mi) ne
          može da ga povrati.
        </div>

        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={busy}
        >
          {busy ? (
            <span className="loading loading-spinner" />
          ) : (
            "Kreiraj stablo"
          )}
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
