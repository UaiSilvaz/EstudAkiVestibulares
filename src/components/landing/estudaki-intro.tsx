"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import type { RouteLoadingMeta } from "@/lib/route-loading";
import { useProductAppearance } from "@/components/use-product-appearance";
import { LOADING_TIMING } from "@/lib/loading-controller";

export function EstudakiIntro({ leaving, label }: RouteLoadingMeta & { leaving: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const { mode } = useProductAppearance();
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = { html: html.style.overflow, body: body.style.overflow };
    const focused = document.activeElement;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    root.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = previous.html;
      body.style.overflow = previous.body;
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, []);
  return <div ref={root} className={`estudaki-intro${leaving ? " estudaki-intro--leaving" : ""}`} style={{ "--loading-exit-duration": `${LOADING_TIMING.exit}ms` } as CSSProperties} tabIndex={-1} data-loading-screen data-theme-mode={mode} role="status" aria-label={label}>
    <Image className="norte-intro__logo norte-intro__logo--light" src="/assets/norte-design/01_Logos_SVG/logo_vertical_branco.svg" alt="Norte Preparatórios" width={624} height={573} unoptimized preload />
    <Image className="norte-intro__logo norte-intro__logo--dark" src="/assets/norte-design/01_Logos_SVG/logo_vertical_laranja.svg" alt="Norte Preparatórios" width={624} height={573} unoptimized preload />
    <p className="norte-intro__label">{label}</p>
    <div className="norte-intro__progress" aria-hidden="true"><span /></div>
  </div>;
}
