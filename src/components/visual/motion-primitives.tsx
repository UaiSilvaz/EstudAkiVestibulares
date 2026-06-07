"use client";

import { motion, type MotionProps, type Variants } from "framer-motion";
import {
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useCallback,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  duration?: number;
};

export function FadeUp({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
  duration = 0.6,
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  duration?: number;
};

export function FadeIn({ children, delay = 0, className, duration = 0.7 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  delay?: number;
};

export function Stagger({ children, className, delay = 0 }: StaggerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delayChildren: delay }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn("h-full")}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  glowClassName?: string;
  spotlightColor?: string;
  tilt?: boolean;
  innerClassName?: string;
} & MotionProps;

export const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(
  function SpotlightCard(
    { children, className, spotlightColor = "rgba(30,115,255,0.18)", tilt = true, ...rest },
    ref,
  ) {
    const localRef = useRef<HTMLDivElement | null>(null);

    const handleMouseMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        const el = localRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--mx", `${x}%`);
        el.style.setProperty("--my", `${y}%`);
        if (tilt) {
          const rx = ((y - 50) / 50) * -3;
          const ry = ((x - 50) / 50) * 3;
          el.style.setProperty("--rx", `${rx}deg`);
          el.style.setProperty("--ry", `${ry}deg`);
        }
      },
      [tilt],
    );

    const handleMouseLeave = useCallback(() => {
      const el = localRef.current;
      if (!el) return;
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
    }, []);

    return (
      <motion.div
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            "--mx": "50%",
            "--my": "50%",
            "--rx": "0deg",
            "--ry": "0deg",
            transformStyle: "preserve-3d",
            transform: "perspective(900px) rotateX(var(--rx)) rotateY(var(--ry))",
            transition: "transform 280ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 250ms ease",
          } as CSSProperties
        }
        whileHover={{ y: -6 }}
        className={cn(
          "ek-spotlight group relative isolate overflow-hidden rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_30px_60px_-22px_rgba(30,115,255,0.35)]",
          className,
        )}
        {...rest}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at var(--mx) var(--my), ${spotlightColor}, transparent 55%)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(120deg, transparent 0%, ${spotlightColor} 50%, transparent 100%)`,
            mixBlendMode: "overlay",
          }}
        />
        {children}
      </motion.div>
    );
  },
);

type FloatingBlobProps = {
  className?: string;
  color?: "blue" | "orange" | "green" | "yellow" | "aqua" | "violet" | "pink" | (string & {});
  size?: string;
  delay?: number;
  duration?: number;
};

export function FloatingBlob({
  className,
  color = "blue",
  size = "30rem",
  delay = 0,
  duration = 18,
}: FloatingBlobProps) {
  const colorClass: Record<string, string> = {
    blue: "ek-glow-blue",
    orange: "ek-glow-orange",
    green: "ek-glow-green",
    yellow: "ek-glow-yellow",
    aqua: "ek-glow-aqua",
    violet: "ek-glow-violet",
    pink: "ek-glow-pink",
  };
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", colorClass[color], className)}
      style={{
        width: size,
        height: size,
        animation: `ek-float-slow ${duration}s ease-in-out ${delay}s infinite`,
        opacity: 0.55,
        filter: "blur(80px)",
      }}
    />
  );
}

export function GradientText({
  children,
  className,
  variant = "mix",
}: {
  children: ReactNode;
  className?: string;
  variant?: "mix" | "blue" | "orange" | "white";
}) {
  const map: Record<string, string> = {
    mix: "ek-text-gradient-mix",
    blue: "ek-text-gradient-blue",
    orange: "ek-text-gradient",
    white: "text-white",
  };
  return <span className={cn(map[variant], className)}>{children}</span>;
}

type GradientBorderCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: "blue" | "orange" | "mix";
};

export function GradientBorderCard({
  children,
  className,
  innerClassName,
  variant = "mix",
}: GradientBorderCardProps) {
  const variantMap: Record<string, string> = {
    blue: "ek-border-gradient-blue",
    orange: "ek-border-gradient-orange",
    mix: "ek-border-gradient",
  };
  return (
    <div className={cn("p-[2px]", variantMap[variant], className)}>
      <div className={cn("rounded-[26px] bg-white p-6", innerClassName)}>{children}</div>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <FadeUp className={cn("mb-12 max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <div
          className={cn(
            "mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700 backdrop-blur",
            align === "center" && "mx-auto",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#ff6b00] to-[#ffc400]" />
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-4xl font-extrabold tracking-tight text-[#061a40] md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base font-medium leading-7 text-slate-500 md:text-lg">
          {description}
        </p>
      )}
    </FadeUp>
  );
}

export function GlowIcon({
  children,
  className,
  size = "h-14 w-14",
  rounded = "rounded-2xl",
  bgClass = "from-[#1E73FF] via-[#005CFF] to-[#00C896]",
  glowClass = "ek-glow-blue",
}: {
  children: ReactNode;
  className?: string;
  size?: string;
  rounded?: string;
  bgClass?: string;
  glowClass?: string;
}) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        aria-hidden
        className={cn("absolute inset-0 -z-10 scale-125 opacity-70 blur-2xl", glowClass)}
      />
      <div
        className={cn(
          "relative flex items-center justify-center text-white shadow-[0_12px_30px_-10px_rgba(15,23,42,0.3)]",
          size,
          rounded,
          "bg-gradient-to-br",
          bgClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}
