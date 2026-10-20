"use client";

import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "estudaki:appearance";
export function useProductAppearance() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"); setMode(saved.colorMode === "dark" || (saved.colorMode === "system" && media.matches) ? "dark" : "light"); }
      catch { setMode("light"); }
    };
    queueMicrotask(sync); media.addEventListener("change", sync); window.addEventListener("estudaki:appearance-updated", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("estudaki:appearance-updated", sync); };
  }, []);
  function toggleMode() {
    const colorMode = mode === "light" ? "dark" : "light";
    setMode(colorMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ colorMode, backgroundIntensity: "subtle", iconMood: "line" }));
      window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
    }
    catch { /* The selected mode still works when browser storage is unavailable. */ }
  }
  return { mode, toggleMode };
}
