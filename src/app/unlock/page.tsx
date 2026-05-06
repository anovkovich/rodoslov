"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/ui/Header";
import UnlockForm from "@/components/auth/UnlockForm";
import { findTree } from "@/lib/tree/registry";
import { useSessionStore } from "@/lib/auth/store";
import type { TreeMeta } from "@/lib/tree/types";

const ALLOWED_FROM = ["/editor", "/view"];

function safeRedirect(from: string | null): string {
  if (!from) return "/editor";
  return ALLOWED_FROM.includes(from) ? from : "/editor";
}

function UnlockPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const treeId = params.get("tree");
  const redirectTo = useMemo(() => safeRedirect(params.get("from")), [params]);

  const hydrated = useSessionStore((s) => s.hydrated);
  const hasKey = useSessionStore((s) => s.hasKey);
  const unlockedTreeId = useSessionStore((s) => s.unlockedTreeId);

  const [tree, setTree] = useState<TreeMeta | null | undefined>(undefined);

  useEffect(() => {
    if (!treeId) {
      setTree(null);
      return;
    }
    setTree(findTree(treeId));
  }, [treeId]);

  // Skip the form if this exact tree is already unlocked.
  useEffect(() => {
    if (!hydrated) return;
    if (hasKey && unlockedTreeId === treeId) {
      router.replace(redirectTo);
    }
  }, [hydrated, hasKey, unlockedTreeId, treeId, redirectTo, router]);

  if (!treeId || tree === null) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="card bg-base-100 shadow max-w-md w-full">
          <div className="card-body items-center text-center gap-3">
            <div className="text-5xl" aria-hidden>
              🤔
            </div>
            <h2 className="card-title">Stablo nije pronađeno</h2>
            <p className="text-sm text-base-content/70">
              Verovatno je obrisano ili link nije ispravan.
            </p>
            <Link href="/" className="btn btn-primary mt-2">
              Lista stabala
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (tree === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <UnlockForm tree={tree} redirectTo={redirectTo} />
    </main>
  );
}

export default function UnlockPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center p-6">
            <span className="loading loading-spinner loading-lg text-primary" />
          </main>
        }
      >
        <UnlockPageInner />
      </Suspense>
    </div>
  );
}
