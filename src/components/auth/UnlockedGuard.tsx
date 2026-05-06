"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/auth/store";

interface Props {
  children: React.ReactNode;
}

export default function UnlockedGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSessionStore((s) => s.hydrated);
  const hasKey = useSessionStore((s) => s.hasKey);
  const unlockedTreeId = useSessionStore((s) => s.unlockedTreeId);

  useEffect(() => {
    if (!hydrated) return;
    if (hasKey) return;
    if (unlockedTreeId) {
      const params = new URLSearchParams({
        tree: unlockedTreeId,
        from: pathname,
      });
      router.replace(`/unlock?${params.toString()}`);
    } else {
      router.replace("/");
    }
  }, [hydrated, hasKey, unlockedTreeId, pathname, router]);

  if (!hydrated || !hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
