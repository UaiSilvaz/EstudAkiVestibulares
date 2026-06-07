"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
};

const defaultFormat = (value: number) => Math.round(value).toString();

export function AnimatedNumber({
  value,
  duration = 1.4,
  format = defaultFormat,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const initial = display;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      const current = initial + (value - initial) * eased;
      setDisplay(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <motion.span className={className}>{format(display)}</motion.span>;
}
