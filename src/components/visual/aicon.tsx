"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { LucideProps } from "lucide-react";
import { Accessibility, AudioLines, BatteryFull, BatteryLow, BatteryMedium, BookOpen, Bookmark, CalendarDays, ShoppingCart, ChartColumn, TestTubes, Circle, Clock3, UsersRound, Monitor, Code2, FileText, NotebookPen, FlaskConical, FolderOpen, Globe2, HeartPulse, House, Scale, Presentation, Mail, Medal, PenLine, Hexagon, RectangleHorizontal, Search, Syringe, Target, Clapperboard, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const AICON_NAMES = [
  "anatomy", "audio", "bank", "battery-0", "battery-1", "battery-2", "battery-3",
  "battery-full", "battery-loop", "book", "bookmark", "calendar", "cart", "chart",
  "chemistry", "circle", "clock", "community", "desktop", "developer", "document",
  "essay", "flask", "folder", "geography", "health", "home", "law", "live", "mail",
  "medal", "pencil", "polygon", "rectangle", "search", "syringe", "target", "video",
] as const;

export type AiconName = typeof AICON_NAMES[number];
const outlineArtwork: Record<AiconName, LucideIcon> = {
  anatomy: Accessibility, audio: AudioLines, bank: Landmark, "battery-0": BatteryLow,
  "battery-1": BatteryLow, "battery-2": BatteryMedium, "battery-3": BatteryFull,
  "battery-full": BatteryFull, "battery-loop": BatteryLow, book: BookOpen, bookmark: Bookmark,
  calendar: CalendarDays, cart: ShoppingCart, chart: ChartColumn, chemistry: TestTubes,
  circle: Circle, clock: Clock3, community: UsersRound, desktop: Monitor, developer: Code2,
  document: FileText, essay: NotebookPen, flask: FlaskConical, folder: FolderOpen,
  geography: Globe2, health: HeartPulse, home: House, law: Scale, live: Presentation,
  mail: Mail, medal: Medal, pencil: PenLine, polygon: Hexagon, rectangle: RectangleHorizontal,
  search: Search, syringe: Syringe, target: Target, video: Clapperboard,
};
type AiconProps = Omit<LucideProps, "ref"> & {
  name: AiconName;
  tone?: "theme" | "original" | "outline";
  animate?: boolean;
};

/** The supplied artwork, with a static poster and interaction-only animation. */
export const Aicon = forwardRef<SVGSVGElement, AiconProps>(function Aicon({
  name, tone = "theme", animate = true, size = 24, className, children,
  absoluteStrokeWidth, strokeWidth, ...props
}, forwardedRef) {
  const element = useRef<SVGSVGElement>(null);
  const filterId = `aicon-${useId().replace(/:/g, "")}`;
  const [playback, setPlayback] = useState<{ asset: AiconName; cycle: number; loaded: boolean } | null>(null);
  const currentPlayback = animate && playback?.asset === name ? playback : null;
  useImperativeHandle(forwardedRef, () => element.current!);
  // These compatibility props belong to the previous line icons, not raster artwork.
  void absoluteStrokeWidth;
  void strokeWidth;

  useEffect(() => {
    const node = element.current;
    if (!node || !animate || tone === "outline") return;
    const trigger = node.closest("a, button, summary, [role='button']") ?? node;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pointerInside = false;
    let focused = false;
    let played = false;
    let cycle = 0;

    function stop() {
      clearTimeout(timer);
      setPlayback(null);
    }
    function start() {
      if (played || reducedMotion.matches || document.hidden || trigger.matches('[disabled], [aria-disabled="true"]')) return;
      played = true;
      setPlayback({ asset: name, cycle: ++cycle, loaded: false });
      // Keep interaction brief even when the supplied WebP loops indefinitely.
      timer = setTimeout(stop, 2200);
    }
    function leave() {
      if (!pointerInside && !focused) { played = false; stop(); }
    }
    const pointerEnter = (event: Event) => {
      if ((event as PointerEvent).pointerType === "touch") return;
      pointerInside = true; start();
    };
    const pointerLeave = () => { pointerInside = false; leave(); };
    const focusIn = () => { focused = true; start(); };
    const focusOut = (event: Event) => {
      if (trigger.contains((event as FocusEvent).relatedTarget as Node | null)) return;
      focused = false; leave();
    };
    const preferenceChange = () => { if (reducedMotion.matches) stop(); };
    const visibilityChange = () => { if (document.hidden) stop(); };
    trigger.addEventListener("pointerenter", pointerEnter);
    trigger.addEventListener("pointerleave", pointerLeave);
    trigger.addEventListener("focusin", focusIn);
    trigger.addEventListener("focusout", focusOut);
    reducedMotion.addEventListener("change", preferenceChange);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      clearTimeout(timer);
      trigger.removeEventListener("pointerenter", pointerEnter);
      trigger.removeEventListener("pointerleave", pointerLeave);
      trigger.removeEventListener("focusin", focusIn);
      trigger.removeEventListener("focusout", focusOut);
      reducedMotion.removeEventListener("change", preferenceChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [name, animate, tone]);

  if (tone === "outline") {
    const Icon = outlineArtwork[name];
    return <Icon ref={element} size={size} strokeWidth={1.75} aria-hidden="true" {...props}
      className={cn("aicon aicon-outline shrink-0", className)} data-aicon={name} data-aicon-tone="outline">{children}</Icon>;
  }

  return <svg
    ref={element} xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false"
    {...props} className={cn("aicon shrink-0", className)}
    data-aicon={name} data-aicon-tone={tone} data-aicon-playing={currentPlayback?.loaded || undefined}
  >
    {tone === "theme" && <defs><filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
      <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray" />
      <feFlood floodColor="var(--aicon-ink, var(--theme-primary, #243b59))" result="ink" />
      <feComposite in="gray" in2="ink" operator="arithmetic" k1="0" k2="0.62" k3="0.38" k4="0" result="tinted" />
      <feComposite in="tinted" in2="SourceGraphic" operator="in" />
    </filter></defs>}
    <g filter={tone === "theme" ? `url(#${filterId})` : undefined}>
      <image data-aicon-poster="true" href={`/assets/aicons/still/${name}.webp`} width="64" height="64" opacity={currentPlayback?.loaded ? 0 : 1} preserveAspectRatio="xMidYMid meet" />
      {currentPlayback && <image
        key={`${name}-${currentPlayback.cycle}`} data-aicon-animation="true"
        href={`/assets/aicons/animated/${name}.webp`} width="64" height="64"
        preserveAspectRatio="xMidYMid meet" opacity={currentPlayback.loaded ? 1 : 0}
        onLoad={() => setPlayback(current => current?.asset === name ? { ...current, loaded: true } : current)}
        onError={() => setPlayback(null)}
      />}
    </g>
    {children}
  </svg>;
});
