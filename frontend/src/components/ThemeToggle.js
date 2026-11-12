"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
