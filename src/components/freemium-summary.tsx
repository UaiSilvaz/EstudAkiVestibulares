import Link from "next/link";
import { FREE_QUESTION_SAMPLE_SIZE } from "@/lib/freemium";
export function FreemiumSummary() {
  return <section aria-label="Como funciona o Norte Preparatórios" className="grid gap-4 md:grid-cols-2">
    <article className="rounded-[20px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-6"><p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--theme-muted)]">Primeiro passo</p><h2 className="font-semibold text-[color:var(--theme-text)]">Conta gratuita</h2><p className="mt-2 text-sm leading-6 text-[color:var(--theme-muted)]">Plano básico, progresso e uma seleção de até {FREE_QUESTION_SAMPLE_SIZE} questões, além das atividades demonstrativas.</p><Link href="/cronograma" className="mt-4 inline-block text-sm font-semibold text-[color:var(--theme-primary)]">Ver meu plano</Link></article>
    <article className="rounded-[20px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-6"><p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--theme-muted)]">Sua escolha</p><h2 className="font-semibold text-[color:var(--theme-text)]">Cursos oficiais, compra individual</h2><p className="mt-2 text-sm leading-6 text-[color:var(--theme-muted)]">Escolha o curso desejado. Consulte aulas e materiais incluídos; o acesso é liberado após a confirmação do pagamento.</p><Link href="/explorar" className="mt-4 inline-block text-sm font-semibold text-[color:var(--theme-primary)]">Explorar preparatórios</Link></article>
  </section>;
}
