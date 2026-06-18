"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ChevronRight, LogIn } from "lucide-react";
import "./PillNav.css";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
  icon?: ReactNode;
};

type PillNavProps = {
  logo?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaIcon?: ReactNode;
};

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#ffffff",
  pillColor = "#06245C",
  hoveredPillTextColor = "#06245C",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  ctaLabel = "Entrar",
  ctaHref = "/login",
  ctaIcon = <LogIn />,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? "#FFFFFF";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;
        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = (w * w / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;
        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;
        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });
        const label = pill.querySelector(".pill-label") as HTMLElement | null;
        const white = pill.querySelector(".pill-label-hover") as HTMLElement | null;
        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });
        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;
        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });
        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        }
        tlRefs.current[index] = tl;
      });
    };

    layout();
    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    if (document.fonts?.ready) document.fonts.ready.then(layout).catch(() => {});

    const menu = mobileMenuRef.current;
    if (menu) gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 1 });

    if (initialLoadAnimation) {
      const navItems = navItemsRef.current;
      const cta = ctaRef.current;
      if (navItems) {
        gsap.set(navItems, { opacity: 0, y: -6 });
        gsap.to(navItems, { opacity: 1, y: 0, duration: 0.55, ease, delay: 0.1 });
      }
      if (cta) {
        gsap.set(cta, { opacity: 0, scale: 0.9 });
        gsap.to(cta, { opacity: 1, scale: 1, duration: 0.55, ease, delay: 0.2 });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.45,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const animateMobileMenu = useCallback((open: boolean) => {
    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line");
      gsap.to(lines[0], { rotation: open ? 45 : 0, y: open ? 3 : 0, duration: 0.3, ease });
      gsap.to(lines[1], { rotation: open ? -45 : 0, y: open ? -3 : 0, duration: 0.3, ease });
    }

    if (!menu) return;

    if (open) {
      gsap.set(menu, { visibility: "visible" });
      gsap.fromTo(
        menu,
        { opacity: 0, y: 12, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease, transformOrigin: "top center" }
      );
      return;
    }

    gsap.to(menu, {
      opacity: 0,
      y: 10,
      scale: 0.98,
      duration: 0.2,
      ease,
      transformOrigin: "top center",
      onComplete: () => gsap.set(menu, { visibility: "hidden" }),
    });
  }, [ease]);

  const closeMobileMenu = useCallback(() => {
    if (!isMobileMenuOpen) return;
    setIsMobileMenuOpen(false);
    animateMobileMenu(false);
  }, [animateMobileMenu, isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    animateMobileMenu(newState);
    onMobileMenuClick?.();
  }, [animateMobileMenu, isMobileMenuOpen, onMobileMenuClick]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1181px)").matches) closeMobileMenu();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [closeMobileMenu, isMobileMenuOpen]);

  const isExternalLink = (href: string) =>
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#");

  const cssVars: Record<string, string> = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": resolvedPillTextColor,
  };

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
        <Link
          className="pill-logo"
          href="/"
          aria-label="Inicio"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={logoAlt}
              className="pill-logo-image"
              draggable={false}
            />
          ) : (
            <>
              <span className="pill-logo-mark">&</span>
              <span className="pill-logo-text">E</span>
            </>
          )}
        </Link>

        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => {
              const isExternal = isExternalLink(item.href);
              const isActive = activeHref === item.href;
              const classNames = `pill${isActive ? " is-active" : ""}`;
              const content = (
                <>
                  <span
                    className="hover-circle"
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el;
                    }}
                  />
                  {item.icon ? (
                    <span className="pill-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="label-stack">
                    <span className="pill-label">{item.label}</span>
                    <span className="pill-label-hover" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.href || `item-${i}`} role="none">
                  {isExternal ? (
                    <a
                      role="menuitem"
                      href={item.href}
                      className={classNames}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={classNames}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <Link
          href={ctaHref}
          className="pill-cta desktop-only"
          aria-label={ctaLabel}
          ref={(el) => {
            ctaRef.current = el;
          }}
        >
          {ctaIcon ? (
            <span className="pill-cta-icon" aria-hidden="true">
              {ctaIcon}
            </span>
          ) : null}
          <span>{ctaLabel}</span>
        </Link>

        <button
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-controls="landing-mobile-menu"
          aria-expanded={isMobileMenuOpen}
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <Link
          href={ctaHref}
          className="mobile-login-button mobile-only"
          aria-label={ctaLabel}
        >
          {ctaIcon ? (
            <span className="mobile-login-icon" aria-hidden="true">
              {ctaIcon}
            </span>
          ) : null}
        </Link>
      </nav>

      <div
        id="landing-mobile-menu"
        className="mobile-menu-popover mobile-only"
        ref={mobileMenuRef}
      >
        <ul className="mobile-menu-list">
          {items.map((item, i) => {
            const isExternal = isExternalLink(item.href);
            const content = (
              <>
                {item.icon ? (
                  <span className="mobile-link-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
                <ChevronRight className="mobile-link-arrow" aria-hidden="true" />
              </>
            );

            return (
              <li key={item.href || `mobile-item-${i}`}>
                {isExternal ? (
                  <a
                    href={item.href}
                    className="mobile-menu-link"
                    onClick={closeMobileMenu}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="mobile-menu-link"
                    onClick={closeMobileMenu}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          href={ctaHref}
          className="mobile-cta"
          onClick={closeMobileMenu}
        >
          {ctaIcon ? (
            <span className="mobile-cta-icon" aria-hidden="true">
              {ctaIcon}
            </span>
          ) : null}
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
