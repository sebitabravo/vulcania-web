"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "vulcania-theme";
type Theme = "light" | "dark";
const themeSubscribers = new Set<() => void>();

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(THEME_KEY);
  } catch {
    // Private browsing can deny storage; follow the OS preference instead.
  }
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  // Read browser storage after hydration so the server and client render the
  // same initial button and do not produce a hydration mismatch.
  const theme = useSyncExternalStore(
    (subscriber) => {
      themeSubscribers.add(subscriber);
      return () => themeSubscribers.delete(subscriber);
    },
    getInitialTheme,
    () => "dark" as Theme
  );
  const dark = theme === "dark";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Theme remains active for this render even when storage is unavailable.
    }
    applyTheme(next);
    themeSubscribers.forEach((subscriber) => subscriber());
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
