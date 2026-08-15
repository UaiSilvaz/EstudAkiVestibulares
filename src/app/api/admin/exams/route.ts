import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { parseAnswerKey } from "@/lib/exam-simulations";

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;

  const body = (await request.json()) as {
    vestibularId?: string; title?: string; year?: number; phase?: string; day?: string;
    pdfUrl?: string; answerKeyUrl?: string; sourceUrl?: string; imageUrl?: string;
    questionCount?: number; durationMinutes?: number; color?: string; isSimulado?: boolean;
    description?: string; instructions?: string; startsAt?: string; endsAt?: string;
    resultsAt?: string; answerKey?: string;
  };

  if (!body.vestibularId || !body.title || !body.year || !body.phase) {
    return NextResponse.json({ error: "Campos obrigatorios ausentes." }, { status: 400 });
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  const resultsAt = body.resultsAt ? new Date(body.resultsAt) : null;
  const answerKey = parseAnswerKey(body.answerKey ?? "");

  if (body.isSimulado) {
    if (!body.pdfUrl || !body.questionCount || !body.durationMinutes || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Simulado exige PDF, quantidade, duracao, abertura e encerramento." }, { status: 400 });
    }
    if (startsAt >= endsAt || (resultsAt && resultsAt < endsAt)) {
      return NextResponse.json({ error: "Confira as datas do evento e da liberacao do resultado." }, { status: 400 });
    }
    if (Object.keys(answerKey).length !== body.questionCount) {
      return NextResponse.json({ error: `O gabarito deve ter ${body.questionCount} respostas.` }, { status: 400 });
    }
  }

  try {
    const exam = await db.exam.create({
      data: {
        vestibularId: body.vestibularId, title: body.title.trim(), year: body.year,
        phase: body.phase.trim(), day: body.day?.trim() || null, pdfUrl: body.pdfUrl || null,
        answerKeyUrl: body.answerKeyUrl || null, sourceUrl: body.sourceUrl || null,
        imageUrl: body.imageUrl || null, questionCount: body.questionCount || null,
        durationMinutes: body.durationMinutes || null, color: body.color ?? "#1E73FF",
        status: "PUBLISHED", isSimulado: Boolean(body.isSimulado),
        description: body.description?.trim() || null, instructions: body.instructions?.trim() || null,
        startsAt, endsAt, resultsAt, answerKey: JSON.stringify(answerKey),
      },
    });
    await db.activity.create({
      data: { userId: user.id, type: "CONTENT", message: `${user.name} cadastrou ${body.isSimulado ? "o simulado" : "a prova"} ${body.title}.` },
    });
    return NextResponse.json({ exam });
  } catch (error) {
    console.error("Falha ao cadastrar prova/simulado", error);
    return NextResponse.json({ error: "Banco de dados indisponível. O cadastro não foi salvo." }, { status: 503 });
  }
}
