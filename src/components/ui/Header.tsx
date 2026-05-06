"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TreeStats from "./TreeStats";
import TreeSearch from "./TreeSearch";
import ThemeToggle from "./ThemeToggle";
import TreeMenu from "./TreeMenu";
import { useSessionStore } from "@/lib/auth/store";

interface Props {
  onSelectPerson?: (id: string) => void;
  showStatsAndSearch?: boolean;
}

export default function Header({
  onSelectPerson,
  showStatsAndSearch = false,
}: Props) {
  const pathname = usePathname();
  const hasKey = useSessionStore((s) => s.hasKey);

  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-4 gap-3 flex-wrap">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span aria-hidden>🌳</span>
          <span>Family Tree</span>
        </Link>

        {hasKey && (
          <div role="tablist" className="tabs tabs-boxed tabs-sm">
            <Link
              role="tab"
              href="/editor"
              className={`tab ${pathname === "/editor" ? "tab-active" : ""}`}
            >
              Editor
            </Link>
            <Link
              role="tab"
              href="/view"
              className={`tab ${pathname === "/view" ? "tab-active" : ""}`}
            >
              Pregled
            </Link>
          </div>
        )}
      </div>

      {showStatsAndSearch && hasKey && (
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <TreeStats />
          {onSelectPerson && <TreeSearch onSelect={onSelectPerson} />}
        </div>
      )}

      {!(showStatsAndSearch && hasKey) && <div className="flex-1" />}

      <div className="flex items-center gap-1">
        <ThemeToggle />
        {hasKey ? (
          <TreeMenu />
        ) : (
          <Link href="/new" className="btn btn-primary btn-sm">
            Novo stablo
          </Link>
        )}
      </div>
    </header>
  );
}
