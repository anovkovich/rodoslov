"use client";

import { useEffect, useState } from "react";
import { useTreeStore } from "@/lib/tree/store";
import type { Gender, Person } from "@/lib/tree/types";

export type FormMode =
  | { kind: "idle" }
  | { kind: "addRoot" }
  | { kind: "addChild"; parentId: string }
  | { kind: "addPartner"; personId: string }
  | { kind: "edit"; personId: string };

interface Props {
  mode: FormMode;
  onChange: (mode: FormMode) => void;
  onDone: (id: string) => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  birthYear: string;
  deathYear: string;
  gender: Gender | "";
  notes: string;
  familyName: string;
  familyBio: string;
  posterSource: string;
  posterDesigner: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  birthYear: "",
  deathYear: "",
  gender: "",
  notes: "",
  familyName: "",
  familyBio: "",
  posterSource: "",
  posterDesigner: "",
};

function fromPerson(p: Person): FormState {
  return {
    firstName: p.firstName,
    lastName: p.lastName ?? "",
    birthYear: p.birthYear?.toString() ?? "",
    deathYear: p.deathYear?.toString() ?? "",
    gender: p.gender ?? "",
    notes: p.notes ?? "",
    familyName: p.familyName ?? "",
    familyBio: p.familyBio ?? "",
    posterSource: p.posterSource ?? "",
    posterDesigner: p.posterDesigner ?? "",
  };
}

function toPatch(f: FormState): Omit<Person, "id" | "parentId"> {
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim() || undefined,
    birthYear: f.birthYear ? Number(f.birthYear) : undefined,
    deathYear: f.deathYear ? Number(f.deathYear) : undefined,
    gender: f.gender || undefined,
    notes: f.notes.trim() || undefined,
    familyName: f.familyName.trim() || undefined,
    familyBio: f.familyBio.trim() || undefined,
    posterSource: f.posterSource.trim() || undefined,
    posterDesigner: f.posterDesigner.trim() || undefined,
  };
}

export default function NodeForm({ mode, onChange, onDone }: Props) {
  const people = useTreeStore((s) => s.people);
  const addChild = useTreeStore((s) => s.addChild);
  const addPartner = useTreeStore((s) => s.addPartner);
  const updatePerson = useTreeStore((s) => s.updatePerson);
  const removePerson = useTreeStore((s) => s.removePerson);
  const rootId = useTreeStore((s) => s.rootId);

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (mode.kind === "edit") {
      const p = people[mode.personId];
      if (p) setForm(fromPerson(p));
    } else if (mode.kind === "addChild") {
      setForm({ ...EMPTY, gender: "M" });
    } else if (mode.kind === "addPartner") {
      setForm(EMPTY);
    }
  }, [mode, people]);

  if (mode.kind === "idle") {
    return (
      <div className="card-body p-4 items-center justify-center text-center gap-2 h-full">
        <div className="text-4xl opacity-40">👤</div>
        <p className="text-sm text-base-content/60">
          Izaberite osobu iz liste za izmenu, ili dodajte dete/partnera.
        </p>
      </div>
    );
  }

  const targetId =
    mode.kind === "addChild"
      ? mode.parentId
      : mode.kind === "addPartner"
        ? mode.personId
        : mode.kind === "edit"
          ? mode.personId
          : null;

  const target = targetId ? people[targetId] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) return;
    const patch = toPatch(form);

    if (mode.kind === "addChild") {
      addChild(mode.parentId, patch);
      // Keep selection on the parent so another child can be added quickly.
      onDone(mode.parentId);
    } else if (mode.kind === "addPartner") {
      addPartner(mode.personId, patch);
      // Keep selection on the primary person, not on the new partner.
      onDone(mode.personId);
    } else if (mode.kind === "edit") {
      updatePerson(mode.personId, patch);
      onDone(mode.personId);
    }
  };

  const handleDelete = () => {
    if (mode.kind !== "edit") return;
    if (mode.personId === rootId) {
      alert("Root osoba se ne može obrisati dok postoje deca. Obrišite decu prvo.");
      return;
    }
    if (!confirm("Sigurno obrisati ovu osobu?")) return;
    removePerson(mode.personId);
    onChange({ kind: "idle" });
  };

  const title =
    mode.kind === "addChild"
      ? `Dodaj dete · ${target?.firstName ?? ""}`
      : mode.kind === "addPartner"
        ? `Dodaj partnera · ${target?.firstName ?? ""}`
        : "Izmeni osobu";

  return (
    <form onSubmit={handleSubmit} className="card-body p-4 gap-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-base-content/70">{title}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => onChange({ kind: "idle" })}
          aria-label="Zatvori"
        >
          ✕
        </button>
      </div>

      {mode.kind === "edit" && target && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => onChange({ kind: "addChild", parentId: target.id })}
          >
            + Dete
          </button>
          {target.partnerId && people[target.partnerId] ? (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              title="Izmeni partnera"
              onClick={() =>
                onChange({ kind: "edit", personId: target.partnerId! })
              }
            >
              ↔ {people[target.partnerId].firstName || "partner"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() =>
                onChange({ kind: "addPartner", personId: target.id })
              }
            >
              + Partner
            </button>
          )}
        </div>
      )}

      <label className="form-control">
        <span className="label-text mb-1">Ime *</span>
        <input
          className="input input-sm input-bordered"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          required
          autoFocus
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">Prezime</span>
        <input
          className="input input-sm input-bordered"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
      </label>

      {mode.kind === "edit" && mode.personId === rootId && (
        <>
          <label className="form-control">
            <span className="label-text mb-1">
              Naziv porodice
              <span className="text-xs text-base-content/50 ml-1">
                (na dekorativnom posteru)
              </span>
            </span>
            <input
              className="input input-sm input-bordered"
              value={form.familyName}
              placeholder="npr. Petrović"
              onChange={(e) =>
                setForm({ ...form, familyName: e.target.value })
              }
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">
              Porodična istorija
              <span className="text-xs text-base-content/50 ml-1">
                (kratak opis, prikazan ispod naziva)
              </span>
            </span>
            <textarea
              className="textarea textarea-bordered textarea-sm min-h-[90px]"
              value={form.familyBio}
              placeholder="Nekoliko rečenica o poreklu, mestu, tradiciji..."
              onChange={(e) =>
                setForm({ ...form, familyBio: e.target.value })
              }
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">
              Autor stabla
              <span className="text-xs text-base-content/50 ml-1">
                (donji levi ugao postera)
              </span>
            </span>
            <input
              className="input input-sm input-bordered"
              value={form.posterDesigner}
              placeholder="Dizajnirao Aleksa Miladinov 2026."
              onChange={(e) =>
                setForm({ ...form, posterDesigner: e.target.value })
              }
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">
              Autor spisa
              <span className="text-xs text-base-content/50 ml-1">
                (donji desni ugao postera)
              </span>
            </span>
            <input
              className="input input-sm input-bordered"
              value={form.posterSource}
              placeholder="Po spisu Mirka Petrovića (Čkalje)"
              onChange={(e) =>
                setForm({ ...form, posterSource: e.target.value })
              }
            />
          </label>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="form-control">
          <span className="label-text mb-1">Rođenje</span>
          <input
            type="number"
            className="input input-sm input-bordered"
            value={form.birthYear}
            onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Smrt</span>
          <input
            type="number"
            className="input input-sm input-bordered"
            value={form.deathYear}
            onChange={(e) => setForm({ ...form, deathYear: e.target.value })}
          />
        </label>
      </div>

      <label className="form-control">
        <span className="label-text mb-1">Pol</span>
        <select
          className="select select-sm select-bordered"
          value={form.gender}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value as Gender | "" })
          }
        >
          <option value="">—</option>
          <option value="M">Muški</option>
          <option value="F">Ženski</option>
          <option value="O">Ostalo</option>
        </select>
      </label>

      <label className="form-control flex-1">
        <span className="label-text mb-1">Beleška</span>
        <textarea
          className="textarea textarea-bordered textarea-sm min-h-[70px]"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>

      <div className="card-actions justify-between items-center">
        {mode.kind === "edit" ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={handleDelete}
          >
            Obriši
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm">
            Sačuvaj
          </button>
        </div>
      </div>

    </form>
  );
}
