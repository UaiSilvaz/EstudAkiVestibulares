"use client";

import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "energy"
  | "success"
  | "glass"
  | "ghost"
  | "outline-light"
  | "dark";

type EKButtonProps = {
  variant?: Variant;
  href?: string;
  children: ReactNode;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
};

const variantClass: Record<Variant, string> = {
  primary: "ek-button-primary",
  energy: "ek-button-energy",
  success: "ek-button-success",
  glass: "ek-button-glass",
  ghost: "ek-button-ghost",
  "outline-light": "ek-button-outline-light",
  dark: "ek-button-dark",
};

const sizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "min-h-9 px-4 text-sm rounded-xl",
  md: "min-h-12 px-5 text-[0.95rem] rounded-2xl",
  lg: "min-h-14 px-7 text-base rounded-2xl",
};

export function EKButton({
  variant = "primary",
  href,
  children,
  icon: Icon,
  iconRight: IconRight = ArrowRight,
  className,
  type = "button",
  onClick,
  disabled,
  fullWidth,
  size = "md",
}: EKButtonProps) {
  const classes = cn(
    "ek-button group/btn",
    variantClass[variant],
    sizeClass[size],
    fullWidth && "w-full",
    className,
  );

  const inner = (
    <>
      {Icon && (
        <Icon className="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-x-0.5" />
      )}
      <span>{children}</span>
      {IconRight && !Icon && (
        <IconRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
      )}
    </>
  );

  if (href) {
    return (
      <motion.span whileTap={{ scale: 0.97 }} className="inline-flex">
        <Link href={href} className={classes}>
          {inner}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {inner}
    </motion.button>
  );
}
