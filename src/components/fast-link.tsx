"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { announceRouteTransition } from "@/components/route-transition-indicator";

type FastLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode;
  pendingClassName?: string;
  pendingLabel?: ReactNode;
  };

function hrefToString(href: LinkProps["href"]) {
  if (typeof href === "string") return href;
  const query = href.query ? `?${new URLSearchParams(href.query as Record<string, string>).toString()}` : "";
  return `${href.pathname ?? ""}${query}`;
}

function canPrefetch(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("#");
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function FastLink({
  href,
  children,
  className,
  onClick,
  onFocus,
  onPointerEnter,
  onTouchStart,
  pendingClassName = "opacity-80",
  pendingLabel,
  prefetch,
  target,
  ...props
}: FastLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const hrefString = hrefToString(href);
  const currentQueryString = searchParams.toString();
  const currentHref = currentQueryString ? `${pathname}?${currentQueryString}` : pathname;
  const pending = pendingTarget === hrefString && currentHref !== hrefString;

  const warmRoute = useCallback(() => {
    if (prefetch !== false && canPrefetch(hrefString)) router.prefetch(hrefString);
  }, [hrefString, prefetch, router]);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPendingTarget(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return (
    <Link
      {...props}
      href={href}
      target={target}
      prefetch={prefetch}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      className={cn("touch-manipulation", className, pending && pendingClassName)}
      onPointerEnter={(event) => {
        warmRoute();
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        warmRoute();
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        warmRoute();
        onFocus?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          isPlainLeftClick(event) &&
          target !== "_blank" &&
          canPrefetch(hrefString) &&
          hrefString !== currentHref
        ) {
          announceRouteTransition(hrefString);
          setPendingTarget(hrefString);
        }
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Link>
  );
}
