"use client";

import { useCallback } from "react";
import ProfileCard from "@/components/reactbits/ProfileCard";

type MaterialProfileCardProps = {
  avatarUrl: string;
  name: string;
  title: string;
  handle: string;
  status: string;
  contactText: string;
  ctaHref: string;
  innerGradient: string;
  behindGlowColor: string;
};

export function MaterialProfileCard({
  avatarUrl,
  name,
  title,
  handle,
  status,
  contactText,
  ctaHref,
  innerGradient,
  behindGlowColor,
}: MaterialProfileCardProps) {
  const handleContactClick = useCallback(() => {
    if (ctaHref === "#") return;
    window.open(ctaHref, "_blank", "noreferrer");
  }, [ctaHref]);

  return (
    <ProfileCard
      className="material-pc"
      avatarUrl={avatarUrl}
      name={name}
      title={title}
      handle={handle}
      status={status}
      contactText={contactText}
      showUserInfo
      enableTilt
      enableMobileTilt={false}
      behindGlowEnabled
      innerGradient={innerGradient}
      behindGlowColor={behindGlowColor}
      behindGlowSize="60%"
      onContactClick={handleContactClick}
    />
  );
}
