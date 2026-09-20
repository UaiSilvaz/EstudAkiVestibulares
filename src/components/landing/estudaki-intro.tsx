"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

type IntroProps = {
  pending?: boolean;
  introductory?: boolean;
  label?: string;
  from?: string;
  to?: string;
  accent?: string;
  onComplete: () => boolean;
};

export function EstudakiIntro({
  pending = false,
  introductory = true,
  label = "Carregando EstudAki",
  from = "#0047ff",
  to = "#22D3EE",
  accent = "#FACC15",
  onComplete,
}: IntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(pending);
  const updatePendingRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    pendingRef.current = pending;
    updatePendingRef.current?.(pending);
  }, [pending]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let context: { revert: () => void } | undefined;
    let isPending = pendingRef.current;
    let readyToExit = !introductory;
    let resume: (() => void) | undefined;
    let hold: (() => void) | undefined;
    let exitTimeout: number | undefined;
    const previousOverflow = document.body.style.overflow;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";

    const finish = () => {
      if (cancelled) return;
      if (isPending || !onComplete()) {
        isPending = true;
        hold?.();
        return;
      }
      document.body.style.overflow = previousOverflow;
    };

    const fallbackExit = () => {
      if (!readyToExit || isPending || cancelled) return;
      root.classList.add("estudaki-intro--leaving");
      window.clearTimeout(exitTimeout);
      exitTimeout = window.setTimeout(finish, reducedMotion ? 0 : 220);
    };

    const fallbackHold = () => {
      window.clearTimeout(exitTimeout);
      root.classList.remove("estudaki-intro--leaving");
    };

    resume = fallbackExit;
    hold = fallbackHold;
    updatePendingRef.current = (value) => {
      isPending = value;
      if (value) hold?.();
      else if (readyToExit) resume?.();
    };

    // A failed or stalled animation import must never cover a ready page forever.
    const watchdog = window.setTimeout(() => {
      context?.revert();
      context = undefined;
      readyToExit = true;
      root.classList.add("estudaki-intro--static");
      resume = fallbackExit;
      hold = fallbackHold;
      fallbackExit();
    }, 3600);

    if (reducedMotion) {
      readyToExit = true;
      root.classList.add("estudaki-intro--static");
      fallbackExit();
    } else {
      void import("gsap").then(({ default: gsap }) => {
        if (cancelled) return;
        window.clearTimeout(watchdog);
        window.clearTimeout(exitTimeout);
        root.classList.remove("estudaki-intro--static", "estudaki-intro--leaving");
        const q = gsap.utils.selector(root);
        const counter = { value: 0 };

        context = gsap.context(() => {
          gsap.set(q("[data-mark]"), {
            autoAlpha: 0, y: 55, scaleX: 0.78, scaleY: 1.22, rotate: -4,
          });
          gsap.set(q("[data-char]"), { yPercent: 120, rotate: 7, opacity: 0 });
          gsap.set(q("[data-micro]"), { autoAlpha: 0, x: -10 });
          gsap.set(q("[data-progress-wrap]"), { autoAlpha: 0, y: 10 });
          gsap.set(q("[data-halo]"), { scale: 0.65, opacity: 0 });

          const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
            onComplete: finish,
          });
          let quickExit: ReturnType<typeof gsap.timeline> | undefined;

          resume = () => {
            if (isPending || !readyToExit) return;
            if (introductory || timeline.time() >= 1.95) {
              timeline.play();
              return;
            }
            // Fast navigation keeps the same reveal without imposing a full intro.
            timeline.pause();
            quickExit?.kill();
            quickExit = gsap.timeline({ onComplete: finish })
              .to(q("[data-wipe]"), { scale: 28, duration: 0.42, ease: "expo.inOut" }, 0)
              .to(q("[data-fade]"), { autoAlpha: 0, duration: 0.18 }, 0.04)
              .to(root, { autoAlpha: 0, duration: 0.18 }, 0.21);
          };

          hold = () => {
            quickExit?.kill();
            if (quickExit || timeline.time() > 1.95) {
              timeline.pause(1.95, true);
              gsap.set(root, { autoAlpha: 1 });
              gsap.set(q("[data-wipe]"), { scale: 0 });
              gsap.set(q("[data-fade]"), { autoAlpha: 1 });
              readyToExit = true;
              quickExit = undefined;
            }
          };

          // Original introduction choreography, including the elastic logo and wipe.
          timeline
            .to(q("[data-micro]"), { autoAlpha: 0.78, x: 0, duration: 0.42 }, 0.05)
            .to(q("[data-progress-wrap]"), { autoAlpha: 1, y: 0, duration: 0.42 }, 0.09)
            .to(q("[data-halo]"), {
              scale: 1, opacity: 0.14, duration: 1.05, stagger: 0.08, ease: "expo.out",
            }, 0.11)
            .to(q("[data-mark]"), {
              autoAlpha: 1, y: 0, rotate: 0, scaleX: 1.08, scaleY: 0.92,
              duration: 0.46, ease: "back.out(1.8)",
            }, 0.15)
            .to(q("[data-mark]"), {
              scaleX: 0.96, scaleY: 1.04, duration: 0.16, ease: "power2.inOut",
            })
            .to(q("[data-mark]"), {
              scaleX: 1, scaleY: 1, duration: 0.22, ease: "elastic.out(1, .45)",
            })
            .to(q("[data-char]"), {
              yPercent: 0, rotate: 0, opacity: 1, duration: 0.58,
              stagger: 0.035, ease: "back.out(1.9)",
            }, 0.38)
            .to(counter, {
              value: 100, duration: 1.45, ease: "power2.inOut",
              onUpdate: () => {
                const progress = root.querySelector("[data-progress]");
                if (progress) progress.textContent = String(Math.round(counter.value)).padStart(2, "0");
              },
            }, 0.22)
            .to(q("[data-progress-bar]"), { scaleX: 1, duration: 1.45, ease: "power2.inOut" }, 0.22)
            .to(q("[data-mark]"), { scale: 1.07, duration: 0.3, ease: "sine.inOut" }, 1.55)
            .to(q("[data-mark]"), { scale: 1, duration: 0.24, ease: "sine.inOut" })
            .addPause(1.95, () => {
              readyToExit = true;
              if (!isPending) timeline.play();
            })
            .to(q("[data-wipe]"), { scale: 28, duration: 0.82, ease: "expo.inOut" }, 1.95)
            .to(q("[data-fade]"), { autoAlpha: 0, duration: 0.2, ease: "power2.out" }, 2.04)
            .to(root, { autoAlpha: 0, duration: 0.32 }, 2.4);

          if (!introductory && !isPending) resume();
        }, root);
      }).catch(() => {
        window.clearTimeout(watchdog);
        readyToExit = true;
        root.classList.add("estudaki-intro--static");
        fallbackExit();
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      window.clearTimeout(exitTimeout);
      updatePendingRef.current = null;
      context?.revert();
      document.body.style.overflow = previousOverflow;
    };
  }, [introductory, onComplete]);

  return (
    <div
      ref={rootRef}
      className="estudaki-intro"
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        "--estudaki-intro-from": from,
        "--estudaki-intro-to": to,
        "--estudaki-intro-accent": accent,
      } as CSSProperties}
    >
      <div className="estudaki-intro__halo estudaki-intro__halo--one" data-halo />
      <div className="estudaki-intro__halo estudaki-intro__halo--two" data-halo />
      <div className="estudaki-intro__brand" data-fade>
        <div className="estudaki-intro__mark" data-mark>
          <Image src="/brand/estudaki-mark.png" alt="" width={180} height={180} priority />
        </div>
        <div className="estudaki-intro__word" aria-hidden="true">
          {"EstudAki".split("").map((char, index) => <span data-char key={`${char}-${index}`}>{char}</span>)}
        </div>
      </div>
      <div className="estudaki-intro__micro" data-micro data-fade aria-hidden="true">
        <span>ESTUDE.</span><span>EVOLUA.</span><span>CONQUISTE.</span>
      </div>
      <div className="estudaki-intro__destination" data-micro data-fade>
        {label}
      </div>
      <div className="estudaki-intro__progress" data-progress-wrap data-fade aria-hidden="true">
        <div className="estudaki-intro__track"><span data-progress-bar /></div>
        <span className="estudaki-intro__count" data-progress>00</span>
      </div>
      <div className="estudaki-intro__wipe" data-wipe />
    </div>
  );
}
