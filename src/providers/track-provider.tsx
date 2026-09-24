"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { tracks, type TrackId } from "@/config/tracks";

const TrackContext = createContext<{ track: TrackId; setTrack: (track: TrackId) => void } | null>(null);

export function TrackProvider({ initialTrack, children }: { initialTrack: TrackId; children: ReactNode }) {
  const [selection, setSelection] = useState<{ source: TrackId; value: TrackId } | null>(null);
  const track = selection?.source === initialTrack ? selection.value : initialTrack;
  useEffect(() => {
    document.documentElement.dataset.track = track;
    try { localStorage.setItem("silva-track", track); } catch { /* Storage can be disabled. */ }
    return () => { delete document.documentElement.dataset.track; };
  }, [track]);

  return <TrackContext.Provider value={{ track, setTrack: (value) => {
    if (value in tracks) setSelection({ source: initialTrack, value });
  } }}>{children}</TrackContext.Provider>;
}

export function useTrack() {
  const value = useContext(TrackContext);
  if (!value) throw new Error("useTrack requires TrackProvider");
  return value;
}
