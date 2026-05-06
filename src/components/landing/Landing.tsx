"use client";

import Link from "next/link";
import Header from "@/components/ui/Header";
import FeatureCard from "./FeatureCard";
import TreeListing from "./TreeListing";
import { FEATURES, FOOTER, HERO } from "./constants";
import { useSessionStore } from "@/lib/auth/store";

export default function Landing() {
  const hasKey = useSessionStore((s) => s.hasKey);
  const unlockedTreeName = useSessionStore((s) => s.unlockedTreeName);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-10 flex flex-col gap-10">
        <section className="flex flex-col items-center text-center gap-3">
          <div className="text-6xl" aria-hidden>
            {HERO.emoji}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {HERO.title}
          </h1>
          <p className="max-w-2xl text-base-content/70">{HERO.lead}</p>

          {hasKey && unlockedTreeName && (
            <div className="alert alert-info max-w-xl mt-2 py-2 text-sm">
              Trenutno je otključano:&nbsp;
              <span className="font-semibold">{unlockedTreeName}</span>
              <Link href="/editor" className="btn btn-xs btn-primary ml-auto">
                Otvori editor
              </Link>
            </div>
          )}
        </section>

        <section>
          <TreeListing />
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              body={f.body}
            />
          ))}
        </section>

        <footer className="text-center text-sm text-base-content/50 py-6">
          {FOOTER}
        </footer>
      </main>
    </div>
  );
}
