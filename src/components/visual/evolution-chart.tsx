"use client";

import { motion } from "framer-motion";

type Props = {
  data: number[];
  labels?: string[];
  height?: number;
  gradientFrom?: string;
  gradientTo?: string;
};

export function EvolutionChart({
  data,
  labels,
  height = 200,
  gradientFrom = "#1E73FF",
  gradientTo = "#00C896",
}: Props) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const width = 480;
  const stepX = width / Math.max(1, data.length - 1);

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = height - 12 - ((value - min) / range) * (height - 30);
    return { x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de evolução"
      >
        <defs>
          <linearGradient id="evolution-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
          <linearGradient id="evolution-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} stopOpacity="0.45" />
            <stop offset="100%" stopColor={gradientTo} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0.2, 0.4, 0.6, 0.8].map((p) => (
          <line
            key={p}
            x1={0}
            x2={width}
            y1={height * p}
            y2={height * p}
            stroke="rgba(30,115,255,0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Area */}
        <motion.path
          d={areaD}
          fill="url(#evolution-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#evolution-line)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Dots */}
        {points.map((point, index) => (
          <motion.g
            key={index}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.06, duration: 0.4 }}
          >
            <circle cx={point.x} cy={point.y} r={6} fill="#ffffff" stroke={gradientFrom} strokeWidth={2.5} />
          </motion.g>
        ))}
      </svg>

      {labels && (
        <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
