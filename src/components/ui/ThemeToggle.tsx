"use client";

import { useEffect, useState } from "react";

const LIGHT = "corporate";
const DARK = "night";
const STORAGE_KEY = "family-tree-theme";

type Theme = typeof LIGHT | typeof DARK;

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(LIGHT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const t: Theme = saved === DARK ? DARK : LIGHT;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === LIGHT ? DARK : LIGHT;
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm btn-circle"
      aria-label={theme === LIGHT ? "Prebaci na tamnu temu" : "Prebaci na svetlu temu"}
      title={theme === LIGHT ? "Tamna tema" : "Svetla tema"}
    >
      {theme === LIGHT ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
