"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import motionData from "./sidebar-motion-icons.json";

export type SidebarMotionIconName =
  | "home"
  | "plan"
  | "questions"
  | "materials"
  | "progress"
  | "community"
  | "settings"
  | "logout"
  | "admin";

type SidebarMotionIconProps = {
  name: SidebarMotionIconName;
  active?: boolean;
  collapsed?: boolean;
  className?: string;
};

type MotionStep = {
  selector: string;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

const MOTION = motionData as Record<SidebarMotionIconName, MotionStep[]>;

const themeMap: Record<SidebarMotionIconName, string> = {
  home: "from-[#D9EBFF] to-[#A7D2FF]",
  plan: "from-[#FFE4A1] to-[#FFBF56]",
  questions: "from-[#BFF1FF] to-[#7DD6FF]",
  materials: "from-[#E4DCFF] to-[#B39FFD]",
  progress: "from-[#D0F6DC] to-[#96E8AE]",
  community: "from-[#CDF7E7] to-[#95E9C6]",
  admin: "from-[#FFE7BD] to-[#FFC46E]",
  settings: "from-[#E6E8FF] to-[#C8CBFF]",
  logout: "from-[#FFD9DA] to-[#FFA5AA]",
};

export function SidebarMotionIcon({
  name,
  active = false,
  collapsed = false,
  className,
}: SidebarMotionIconProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const playMotion = useCallback(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    MOTION[name].forEach((step) => {
      root.querySelectorAll(step.selector).forEach((target) => {
        target.getAnimations().forEach((animation) => animation.cancel());
        target.animate(step.keyframes, { ...step.options, fill: "none" });
      });
    });
  }, [name]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const trigger = root.closest<HTMLElement>("[data-sidebar-motion-trigger], .group") ?? root;

    trigger.addEventListener("mouseenter", playMotion);
    trigger.addEventListener("focusin", playMotion);
    trigger.addEventListener("click", playMotion);

    return () => {
      trigger.removeEventListener("mouseenter", playMotion);
      trigger.removeEventListener("focusin", playMotion);
      trigger.removeEventListener("click", playMotion);
    };
  }, [playMotion]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        "sidebar-motion-icon relative inline-grid shrink-0 place-items-center overflow-visible bg-gradient-to-br shadow-[0_10px_18px_rgba(31,63,112,0.11)] ring-1 ring-white/70 transition duration-200",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_58%)]",
        collapsed ? "h-9 w-9 rounded-[14px]" : "h-8 w-8 rounded-[13px]",
        active && "scale-[1.04] shadow-[0_14px_24px_rgba(23,105,255,0.18)]",
        themeMap[name],
        className,
      )}
    >
      <IconSvg name={name} className={collapsed ? "h-7 w-7" : "h-6 w-6"} />
    </span>
  );
}

function IconSvg({ name, className }: { name: SidebarMotionIconName; className: string }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <circle className="halo" cx="16" cy="16" r="11.8" fill="#73b8ff" opacity="0" />
        <g className="home-body">
          <path d="M7.1 14.8 16 7.2l8.9 7.6v9.25A2.95 2.95 0 0 1 21.95 27H10.05A2.95 2.95 0 0 1 7.1 24.05Z" fill="#176cf0" />
          <path d="M10 15.7 16 10.55l6 5.15v8.15c0 .65-.53 1.18-1.18 1.18H11.18c-.65 0-1.18-.53-1.18-1.18Z" fill="#f9fcff" />
          <rect className="home-door" x="13.6" y="18.5" width="4.8" height="6.55" rx="1.55" fill="#5aa7ff" />
          <circle cx="17.1" cy="21.8" r=".55" fill="#ffffff" />
        </g>
        <g className="home-roof">
          <path d="M5.9 15.35 15.15 7.2a1.28 1.28 0 0 1 1.7 0l9.25 8.15" fill="none" stroke="#0d58d8" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20.9 8.65v-2.2h3.25v5.15" fill="#0d58d8" />
        </g>
        <g className="home-spark" opacity="0">
          <path d="M24.9 6.1v3.2M23.3 7.7h3.2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (name === "plan") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <g className="icon-main">
          <path d="M9 5.2h11.8l5 5v14.6a2.6 2.6 0 0 1-2.6 2.6H9a2.6 2.6 0 0 1-2.6-2.6v-17A2.6 2.6 0 0 1 9 5.2Z" fill="#ff7a38" />
          <path d="M20.7 5.2v5.3h5.1Z" fill="#ffb34f" />
        </g>
        <g className="check-card">
          <rect x="3.8" y="15.1" width="13.2" height="11.7" rx="4" fill="#ffbe2e" />
          <path className="tick" d="m7.9 20.8 2 2 3.7-4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  if (name === "questions") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <g className="icon-main">
          <rect x="6.2" y="4.8" width="19.6" height="22.4" rx="4" fill="#1778ee" />
          <rect x="9.6" y="8.4" width="12.8" height="3.3" rx="1.65" fill="#75d8ff" />
          <rect className="line-1" x="9.6" y="14.6" width="8.6" height="2.2" rx="1.1" fill="#fff" />
          <rect className="line-2" x="9.6" y="18.9" width="11.8" height="2.2" rx="1.1" fill="#fff" opacity=".92" />
          <rect className="line-3" x="9.6" y="23.2" width="9.4" height="2.2" rx="1.1" fill="#fff" opacity=".72" />
        </g>
        <g className="badge">
          <circle cx="23.7" cy="24.2" r="4.3" fill="#57c8ff" />
          <path d="M23.6 21.7c1.35 0 2.3.7 2.3 1.8 0 1.38-1.25 1.7-1.85 2.25-.32.28-.38.52-.38.84" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (name === "materials") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <path className="folder-lid" d="M5.4 9.8c0-1.45 1.18-2.62 2.62-2.62h6l2.45 2.65h7.5c1.45 0 2.63 1.18 2.63 2.63v1.5H5.4Z" fill="#8b72ef" />
        <path className="icon-main" d="M5.4 12.4h21.2v11.7a3 3 0 0 1-3 3H8.4a3 3 0 0 1-3-3Z" fill="#6d55dc" />
        <rect className="paper" x="12.1" y="11.7" width="8.1" height="10.3" rx="1.9" fill="#f7f3ff" opacity="0" />
        <rect className="paper" x="13.5" y="14.2" width="5.3" height="1.3" rx=".65" fill="#c9baff" opacity="0" />
        <rect className="paper" x="13.5" y="17" width="4.2" height="1.3" rx=".65" fill="#c9baff" opacity="0" />
      </svg>
    );
  }

  if (name === "progress") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <path className="trend-line" d="m6.6 11.8 5.1-4.3 4.5 3 7.6-6.1" fill="none" stroke="#78dda0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect className="bar-1" x="6.2" y="17.1" width="4.2" height="9.1" rx="2.1" fill="#37c36f" />
        <rect className="bar-2" x="13.9" y="12.2" width="4.2" height="14" rx="2.1" fill="#22aa5a" />
        <rect className="bar-3" x="21.6" y="7.1" width="4.2" height="19.1" rx="2.1" fill="#078f46" />
      </svg>
    );
  }

  if (name === "community") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <g className="person-left">
          <circle cx="11" cy="11.2" r="4.2" fill="#2abb8c" />
          <path d="M4.4 25.8c.8-5 3.15-7.55 6.6-7.55s5.8 2.55 6.6 7.55Z" fill="#2abb8c" />
        </g>
        <g className="person-right">
          <circle cx="21.8" cy="10" r="3.6" fill="#159b72" />
          <path d="M16.5 25.6c.58-4.56 2.42-6.83 5.3-6.83 3 0 4.83 2.27 5.5 6.83Z" fill="#159b72" />
        </g>
        <g className="heart-badge">
          <circle cx="17.9" cy="15.8" r="3.25" fill="#a9efd7" />
          <path d="M17.85 17.8c-1.85-1.12-2.55-2.2-2.55-3.14 0-.88.67-1.44 1.47-1.44.56 0 1.04.28 1.32.76.28-.48.76-.76 1.32-.76.8 0 1.47.56 1.47 1.44 0 .94-.7 2.02-2.55 3.14Z" fill="#19a778" />
        </g>
      </svg>
    );
  }

  if (name === "admin") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <circle className="glow-ring" cx="20.9" cy="21.6" r="5.6" fill="#fff3d5" opacity="0" />
        <g className="shield-main">
          <path d="M16 4.2 25.1 8v6.85c0 6.17-3.65 10.67-9.1 13-5.45-2.33-9.1-6.83-9.1-13V8Z" fill="#f39b25" />
          <path d="M16 8.2 21.2 10v4.85c0 4-2.03 7.05-5.2 8.77-3.17-1.72-5.2-4.77-5.2-8.77V10Z" fill="#ffc76a" />
        </g>
        <g className="plus-badge">
          <circle cx="20.9" cy="21.6" r="4.1" fill="#fff1ce" />
          <path d="M20.9 19.1v5M18.4 21.6h5" stroke="#f39b25" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
        <circle className="gear-glow" cx="16" cy="16" r="10.6" fill="#aeb2ff" opacity="0" />
        <g className="gear-main">
          <path fill="#6f74e8" fillRule="evenodd" d="M13.85 3.8h4.3l.62 3.05c.78.23 1.53.54 2.22.93l2.6-1.72 3.04 3.04-1.72 2.6c.39.7.7 1.44.93 2.22l3.05.63v4.3l-3.05.62a10.5 10.5 0 0 1-.93 2.22l1.72 2.6-3.04 3.04-2.6-1.72c-.69.39-1.44.7-2.22.93l-.62 3.05h-4.3l-.63-3.05a10.5 10.5 0 0 1-2.22-.93l-2.6 1.72-3.04-3.04 1.72-2.6a10.5 10.5 0 0 1-.93-2.22l-3.05-.62v-4.3l3.05-.63c.23-.78.54-1.52.93-2.22L5.36 9.1 8.4 6.06 11 7.78c.7-.39 1.44-.7 2.22-.93l.63-3.05ZM16 10.45A5.55 5.55 0 1 0 16 21.55 5.55 5.55 0 0 0 16 10.45Z" />
        </g>
        <g className="gear-core">
          <circle cx="16" cy="16" r="4.05" fill="#d8d9ff" />
          <circle cx="16" cy="16" r="2.05" fill="#ffffff" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className={cn("overflow-visible", className)}>
      <g className="door">
        <path d="M5.8 6.2h11.4a2 2 0 0 1 2 2v15.6a2 2 0 0 1-2 2H5.8Z" fill="#ef6975" />
        <rect x="9" y="9.4" width="7.1" height="13.2" rx="1.3" fill="#ffb9bf" />
        <circle cx="14.3" cy="16" r=".9" fill="#ef6975" />
      </g>
      <rect className="trail" x="17.2" y="14.8" width="8.6" height="2.4" rx="1.2" fill="#ffcad0" opacity="0" />
      <g className="arrow">
        <path d="M16.7 16h9.4" stroke="#b53a49" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m22.9 12.6 3.4 3.4-3.4 3.4" fill="none" stroke="#b53a49" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
