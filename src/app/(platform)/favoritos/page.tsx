import { BookOpen } from "@/components/visual/aicon-icons";
import { Heart, PlayCircle } from "lucide-react";
import { FastLink } from "@/components/fast-link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { getFavoriteLessons, getLearningUserId } from "@/lib/courses/learning";
import { formatCourseDuration } from "@/components/courses/format";

export default async function FavoritosPage() {
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const favorites = userId ? await getFavoriteLessons(userId) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] border border-pink-100     p-6 shadow-sm professional-neutral">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-600">Favoritos</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">Aulas salvas</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">Retome rapidamente as videoaulas, questões e conteúdos que você marcou.</p>
      </section>

      {favorites.length === 0 ? (
        <section className="rounded-[18px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-pink-500" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-slate-950">Nada salvo ainda</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Abra uma aula e toque em salvar para montar sua lista.</p>
          <FastLink href="/cursos" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4" />
            Ver cursos
          </FastLink>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {favorites.map((item) => (
            <FastLink key={item.id} href={item.href} className="group overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              {item.thumbnailUrl && <div className="relative aspect-video overflow-hidden bg-slate-100"><Image src={item.thumbnailUrl} alt="" fill unoptimized className="object-cover transition duration-500 " sizes="(max-width: 1024px) 100vw, 33vw" /><span className="absolute inset-0    professional-neutral" /><span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-blue-700 shadow-lg"><PlayCircle className="h-5 w-5 fill-current" /></span></div>}
              <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-blue-700">{formatCourseDuration(item.durationSeconds)}</span>
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.courseTitle}</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">{item.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-700">
                <PlayCircle className="h-4 w-4" />
                Continuar
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${item.progressPercent}%` }} /></div>
              </div>
            </FastLink>
          ))}
        </section>
      )}
    </div>
  );
}
