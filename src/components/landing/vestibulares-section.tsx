"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { loopImageForVestibular } from "@/lib/assets";

type Vestibular = {
  name: string;
  slug: string;
};

const VESTIBULARES: Vestibular[] = [
  { name: "ENEM", slug: "enem" },
  { name: "ETEC", slug: "etec" },
  { name: "FATEC", slug: "fatec" },
  { name: "FUVEST", slug: "fuvest" },
  { name: "UNESP", slug: "unesp" },
  { name: "UNICAMP", slug: "unicamp" },
  { name: "Provão Paulista", slug: "provao-paulista" },
];

export function VestibularesSection() {
  return (
    <section
      id="vestibulares"
      className="relative isolate hidden overflow-hidden bg-white py-20 md:block lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46rem 24rem at 50% 50%, rgba(40,215,255,0.08), transparent 70%)",
        }}
      />

      <h2 className="sr-only">Vestibulares</h2>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-4 items-center gap-x-10 gap-y-14 lg:grid-cols-7">
          {VESTIBULARES.map((vestibular, index) => (
            <motion.div
              key={vestibular.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: 0.45,
                delay: index * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center justify-center"
            >
              <Link
                href={`/provas?exam=${vestibular.slug}`}
                aria-label={`Abrir provas ${vestibular.name}`}
                className="group flex h-32 w-full items-center justify-center rounded-lg p-2 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#145CFF] lg:h-36"
              >
                <Image
                  src={loopImageForVestibular(vestibular.slug)}
                  alt={vestibular.name}
                  width={280}
                  height={180}
                  className="max-h-24 w-auto max-w-full object-contain transition duration-300 group-hover:scale-110 lg:max-h-28"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
