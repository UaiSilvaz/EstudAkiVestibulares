"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import motionData from "./subject-motion-icons.json";

export type SubjectMotionIconName =
  | "matematica"
  | "linguagens"
  | "redacao"
  | "fisica"
  | "quimica"
  | "biologia"
  | "ciencias_humanas";

export type SubjectMotionIconSize = "xs" | "sm" | "md" | "lg" | "xl";

type SubjectMotionIconProps = {
  name: SubjectMotionIconName;
  label?: string;
  size?: SubjectMotionIconSize;
  decorative?: boolean;
  className?: string;
};

type MotionStep = {
  selector: string;
  keyframes: Keyframe[];
  options?: KeyframeAnimationOptions;
};

type MotionPayload = {
  _meta?: {
    defaults?: KeyframeAnimationOptions;
  };
} & Record<SubjectMotionIconName, MotionStep[]>;

const MOTION = motionData as MotionPayload;

const sizeMap: Record<SubjectMotionIconSize, string> = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-40 w-40",
};

export function SubjectMotionIcon({
  name,
  label,
  size = "md",
  decorative = false,
  className,
}: SubjectMotionIconProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const uniqueId = useId().replace(/:/g, "");

  const playMotion = useCallback(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    MOTION[name].forEach((step) => {
      root.querySelectorAll(step.selector).forEach((target) => {
        target.getAnimations().forEach((animation) => animation.cancel());
        target.animate(step.keyframes, {
          ...(MOTION._meta?.defaults ?? {}),
          ...(step.options ?? {}),
        });
      });
    });
  }, [name]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const trigger = root.closest<HTMLElement>("[data-subject-motion-trigger], .group, a, button") ?? root;

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
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "subject-motion-icon relative inline-flex shrink-0 items-center justify-center overflow-visible",
        "transition duration-200",
        decorative ? "drop-shadow-none" : "drop-shadow-[0_10px_12px_rgba(33,52,80,0.10)]",
        sizeMap[size],
        className,
      )}
    >
      <IconSvg name={name} uniqueId={uniqueId} />
    </span>
  );
}

function IconSvg({ name, uniqueId }: { name: SubjectMotionIconName; uniqueId: string }) {
  if (name === "matematica") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <circle className="math-glow" cx="50" cy="50" r="42" fill="#77a5ff" opacity="0" />
        <g className="math-icon">
          <g className="math-tile-plus">
            <rect x="11" y="10" width="37" height="37" rx="10" fill="#12bb91" />
            <path d="M29.5 19v19M20 28.5h19" stroke="#fff" strokeWidth="4.8" strokeLinecap="round" />
          </g>
          <g className="math-tile-minus">
            <rect x="51" y="10" width="37" height="37" rx="10" fill="#ffc61e" />
            <path d="M61 28.5h17" stroke="#fff" strokeWidth="4.8" strokeLinecap="round" />
          </g>
          <g className="math-tile-times">
            <rect x="11" y="50" width="37" height="37" rx="10" fill="#ff3648" />
            <path d="m22 61 15 15M37 61 22 76" stroke="#fff" strokeWidth="4.8" strokeLinecap="round" />
          </g>
          <g className="math-tile-divide">
            <rect x="51" y="50" width="37" height="37" rx="10" fill="#0b9de7" />
            <circle cx="69.5" cy="60.5" r="2.9" fill="#fff" />
            <path d="M61 68.5h17" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
            <circle cx="69.5" cy="76.5" r="2.9" fill="#fff" />
          </g>
        </g>
      </svg>
    );
  }

  if (name === "linguagens") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <rect className="book-shine" x="25" y="10" width="12" height="75" rx="6" fill="#fff" opacity="0" />
        <g className="book-body">
          <rect x="20" y="10" width="60" height="75" rx="11" fill="#079be8" />
          <path d="M28 18h44a6 6 0 0 1 6 6v48H28Z" fill="#0c7bdc" />
          <rect className="book-page" x="27" y="68" width="49" height="10" rx="5" fill="#ecf8ff" />
          <rect x="31" y="24" width="38" height="14" rx="3" fill="#fff" />
          <rect className="book-label" x="35" y="28" width="30" height="6" rx="3" fill="#dff3ff" />
          <path className="bookmark" d="M45 76v14l7-5 7 5V76Z" fill="#23c7f1" />
        </g>
      </svg>
    );
  }

  if (name === "redacao") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <g className="paper">
          <path d="M17 13h48l14 14v57a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7V20a7 7 0 0 1 7-7Z" fill="#fff0d7" />
          <path d="M65 13v14h14" fill="#ffd5a3" />
          <rect className="text-line-1" x="23" y="34" width="31" height="4" rx="2" fill="#ea9361" />
          <rect className="text-line-2" x="23" y="45" width="36" height="4" rx="2" fill="#ea9361" />
          <rect className="text-line-3" x="23" y="56" width="25" height="4" rx="2" fill="#ea9361" />
          <path className="signature" d="M23 74c7-11 11 9 18-2 4-6 6 6 11 3" fill="none" stroke="#e58a4c" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform="rotate(22 72 51)">
          <g className="pencil-motion">
            <rect x="66" y="10" width="12" height="11" rx="4" fill="#eb6340" />
            <rect x="66" y="20" width="12" height="7" rx="1.5" fill="#f0a149" />
            <rect x="66" y="26" width="12" height="49" rx="3" fill="#f59a24" />
            <rect x="69" y="27" width="3.2" height="46" rx="1.6" fill="#ffc45a" />
            <path d="M66 74h12l-6 14Z" fill="#f3c78a" />
            <path d="m69.5 82 2.5 6 2.5-6Z" fill="#68432f" />
          </g>
        </g>
        <g className="writing-spark" opacity="0">
          <path d="M87 17v8M83 21h8" stroke="#ffb647" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (name === "fisica") {
    const orbitAId = `${uniqueId}-physOrbitA`;
    const orbitBId = `${uniqueId}-physOrbitB`;
    const coreId = `${uniqueId}-physCore`;

    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <defs>
          <linearGradient id={orbitAId} x1="12" y1="34" x2="88" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9AAA" />
            <stop offset="1" stopColor="#F14966" />
          </linearGradient>
          <linearGradient id={orbitBId} x1="28" y1="12" x2="72" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFB0BB" />
            <stop offset="1" stopColor="#FF6078" />
          </linearGradient>
          <radialGradient id={coreId} cx="0" cy="0" r="1" gradientTransform="translate(47 46) rotate(48) scale(13)">
            <stop stopColor="#FF8EA0" />
            <stop offset=".58" stopColor="#F34D69" />
            <stop offset="1" stopColor="#DA2D4C" />
          </radialGradient>
        </defs>
        <g className="physics-master-v5">
          <path d="M 88.00 50.00 C 88.00 58.84, 70.99 66.00, 50.00 66.00 C 29.01 66.00, 12.00 58.84, 12.00 50.00 C 12.00 41.16, 29.01 34.00, 50.00 34.00 C 70.99 34.00, 88.00 41.16, 88.00 50.00 Z" fill="none" stroke={`url(#${orbitAId})`} strokeWidth="5.1" strokeLinecap="round" />
          <path d="M 69.00 82.91 C 61.35 87.33, 46.64 76.18, 36.14 58.00 C 25.65 39.82, 23.35 21.51, 31.00 17.09 C 38.65 12.67, 53.36 23.82, 63.86 42.00 C 74.35 60.18, 76.65 78.49, 69.00 82.91 Z" fill="none" stroke={`url(#${orbitBId})`} strokeWidth="5.1" strokeLinecap="round" />
          <path d="M 69.00 17.09 C 76.65 21.51, 74.35 39.82, 63.86 58.00 C 53.36 76.18, 38.65 87.33, 31.00 82.91 C 23.35 78.49, 25.65 60.18, 36.14 42.00 C 46.64 23.82, 61.35 12.67, 69.00 17.09 Z" fill="none" stroke="#FF788A" strokeWidth="5.1" strokeLinecap="round" />
          <circle className="physics-electron-a-v5" cx="88" cy="50" r="5.3" fill="#E92F50" />
          <circle className="physics-electron-b-v5" cx="31" cy="17.2" r="5.3" fill="#F63D5C" />
          <circle className="physics-electron-c-v5" cx="31" cy="82.8" r="5.3" fill="#D92B4B" />
          <circle cx="50" cy="50" r="12.2" fill="#FF8DA0" opacity=".18" />
          <circle className="physics-nucleus-v5" cx="50" cy="50" r="8.8" fill={`url(#${coreId})`} />
          <circle cx="47.3" cy="47" r="2.2" fill="#FFB5C0" opacity=".9" />
          <g className="physics-spark-v5" opacity="0">
            <path d="M82 13v8M78 17h8" stroke="#FF6078" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    );
  }

  if (name === "quimica") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <g className="chem-master">
          <g className="chem-tube-motion">
            <g transform="rotate(-38 31 34)">
              <rect x="23" y="8" width="17" height="55" rx="8.5" fill="#f3e9ff" stroke="#c89df1" strokeWidth="4" />
              <path className="chem-liquid" d="M27 42h9v12a4.5 4.5 0 0 1-9 0Z" fill="#a742df" />
              <rect x="20.5" y="7" width="22" height="6" rx="3" fill="#b76ce9" />
            </g>
          </g>
          <g className="chem-flask-motion">
            <path d="M54 12h19" stroke="#a75dde" strokeWidth="6" strokeLinecap="round" />
            <path d="M58 15v25L44 69a11 11 0 0 0 10 16h22a11 11 0 0 0 10-16L72 40V15Z" fill="#f1e7ff" stroke="#c89fe9" strokeWidth="4" />
            <path className="chem-liquid" d="M49 66h32l6 12a7 7 0 0 1-6 4H50a7 7 0 0 1-6-4Z" fill="#8d35d7" />
            <path d="M50 67c7-4 13 4 19 0 5-3 9 1 12 0" fill="none" stroke="#c56bec" strokeWidth="3" strokeLinecap="round" />
            <circle cx="61" cy="72" r="3.4" fill="#bc66ed" />
            <circle cx="70" cy="77" r="2.4" fill="#d896f6" />
          </g>
          <circle className="bubble-1" cx="82" cy="28" r="5.2" fill="#bd6bea" />
          <circle className="bubble-2" cx="89" cy="42" r="3.8" fill="#913ada" />
          <circle className="bubble-3" cx="79" cy="49" r="3" fill="#d18af2" />
        </g>
      </svg>
    );
  }

  if (name === "biologia") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
        <g className="bio-master">
          <path className="dna-left" d="M33 8 C33 21 67 21 67 34 C67 47 33 47 33 60 C33 73 67 73 67 92" fill="none" stroke="#4fbf3f" strokeWidth="8" strokeLinecap="round" />
          <path className="dna-right" d="M67 8 C67 21 33 21 33 34 C33 47 67 47 67 60 C67 73 33 73 33 92" fill="none" stroke="#168f36" strokeWidth="8" strokeLinecap="round" />
          <path className="dna-rung-1" d="M40 22h20" stroke="#8edc6b" strokeWidth="5" strokeLinecap="round" />
          <path className="dna-rung-2" d="M36 50h28" stroke="#86d666" strokeWidth="5" strokeLinecap="round" />
          <path className="dna-rung-3" d="M40 78h20" stroke="#96df71" strokeWidth="5" strokeLinecap="round" />
          <circle className="bio-dot" cx="22" cy="29" r="4.2" fill="#66c84e" />
          <circle className="bio-dot" cx="78" cy="69" r="3.6" fill="#2aa63f" />
          <circle className="bio-dot" cx="20" cy="72" r="2.8" fill="#90dc6b" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="block h-full w-full overflow-visible">
      <g className="humanities-master">
        <path d="M17 34 50 13l33 21Z" fill="#f4a900" />
        <path d="M25 33 50 18l25 15Z" fill="#ffd35a" />
        <rect x="19" y="35" width="62" height="7" rx="3.5" fill="#e99a00" />
        <g className="humanities-column">
          <rect x="25" y="43" width="9" height="31" rx="3" fill="#ffc33f" />
          <rect x="45.5" y="43" width="9" height="31" rx="3" fill="#f0a50b" />
          <rect x="66" y="43" width="9" height="31" rx="3" fill="#ffc33f" />
        </g>
        <rect x="20" y="73" width="60" height="7" rx="3.5" fill="#e39700" />
        <rect x="15" y="80" width="70" height="7" rx="3.5" fill="#f2aa0c" />
        <rect x="11" y="87" width="78" height="6" rx="3" fill="#d88900" />
        <circle cx="50" cy="28" r="4" fill="#fff0ae" />
        <g className="humanities-spark" opacity="0">
          <path d="M83 16v8M79 20h8" stroke="#ffbd16" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
