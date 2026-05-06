"use client";

import { useState } from "react";
import { useTreeStore } from "@/lib/tree/store";
import type { Gender } from "@/lib/tree/types";

interface Props {
  onCreate: () => void;
  showForm: boolean;
  onCancel: () => void;
  onDone: () => void;
}

export default function EmptyState({ onCreate, showForm, onCancel, onDone }: Props) {
  const addRoot = useTreeStore((s) => s.addRoot);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [birthYear, setBirthYear] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    addRoot({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      gender: gender || undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
    });
    setFirstName("");
    setLastName("");
    setGender("");
    setBirthYear("");
    onDone();
  };

  if (!showForm) {
    return (
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center gap-4">
          <div className="text-6xl">🌳</div>
          <h2 className="card-title">Počnite porodično stablo</h2>
          <p className="text-base-content/70 text-sm">
            Dodajte osnovnu osobu (root) — sve ostale osobe se kasnije
            povezuju kroz roditelje, partnere i decu.
          </p>
          <button className="btn btn-primary mt-2" onClick={onCreate}>
            + Dodaj osnovnu osobu
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card bg-base-100 shadow-xl max-w-md w-full"
    >
      <div className="card-body gap-3">
        <h2 className="card-title">Osnovna osoba</h2>

        <label className="form-control">
          <span className="label-text mb-1">Ime *</span>
          <input
            className="input input-bordered"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Prezime</span>
          <input
            className="input input-bordered"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="form-control">
            <span className="label-text mb-1">Pol</span>
            <select
              className="select select-bordered"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
            >
              <option value="">—</option>
              <option value="M">Muški</option>
              <option value="F">Ženski</option>
              <option value="O">Ostalo</option>
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Godina rođenja</span>
            <input
              type="number"
              className="input input-bordered"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />
          </label>
        </div>

        <div className="card-actions justify-end mt-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Otkaži
          </button>
          <button type="submit" className="btn btn-primary">
            Sačuvaj
          </button>
        </div>
      </div>
    </form>
  );
}
