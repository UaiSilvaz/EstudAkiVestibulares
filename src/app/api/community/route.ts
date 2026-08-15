import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

async function currentUserId() {
  const user = await getCurrentUser();
  return user ? getPersistedUserId(user) : null;
}

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 401 });

  const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  try {
    const [posts, conversations, users] = await Promise.all([
      db.communityPost.findMany({
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, league: true } },
          likes: { select: { userId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      db.conversation.findMany({
        where: { members: { some: { userId } } },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true, league: true } } },
          },
          messages: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: "asc" },
            take: 60,
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.user.findMany({
        where: {
          id: { not: userId },
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, name: true, avatarUrl: true, league: true, xp: true },
        orderBy: [{ xp: "desc" }, { name: "asc" }],
        take: 30,
      }),
    ]);

    return NextResponse.json({
      posts: posts.map((post) => ({
        ...post,
        liked: post.likes.some((like) => like.userId === userId),
        likeCount: post.likes.length,
        likes: undefined,
      })),
      conversations,
      users,
    });
  } catch (error) {
    console.error("Falha ao carregar comunidade", error);
    return NextResponse.json({ posts: [], conversations: [], users: [], safeMode: true });
  }
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 401 });

  const body = (await request.json()) as {
    action?: "post" | "like" | "conversation" | "message";
    content?: string;
    postId?: string;
    conversationId?: string;
    memberIds?: string[];
    title?: string;
    isGroup?: boolean;
  };

  try {
    if (body.action === "post") {
      const content = body.content?.trim();
      if (!content || content.length > 1200) {
        return NextResponse.json({ error: "Escreva uma publicacao de ate 1.200 caracteres." }, { status: 400 });
      }
      const post = await db.communityPost.create({ data: { userId, content } });
      return NextResponse.json({ post }, { status: 201 });
    }

    if (body.action === "like" && body.postId) {
      const existing = await db.communityPostLike.findUnique({
        where: { userId_postId: { userId, postId: body.postId } },
      });
      if (existing) {
        await db.communityPostLike.delete({ where: { id: existing.id } });
        return NextResponse.json({ liked: false });
      }
      await db.communityPostLike.create({ data: { userId, postId: body.postId } });
      return NextResponse.json({ liked: true });
    }

    if (body.action === "conversation") {
      const memberIds = Array.from(new Set([userId, ...(body.memberIds ?? [])])).slice(0, 30);
      if (memberIds.length < 2) {
        return NextResponse.json({ error: "Escolha pelo menos um colega." }, { status: 400 });
      }
      if (body.isGroup && !body.title?.trim()) {
        return NextResponse.json({ error: "De um nome ao grupo." }, { status: 400 });
      }
      const conversation = await db.conversation.create({
        data: {
          creatorId: userId,
          title: body.isGroup ? body.title!.trim() : null,
          isGroup: Boolean(body.isGroup),
          members: {
            create: memberIds.map((memberId) => ({
              userId: memberId,
              role: memberId === userId ? "ADMIN" : "MEMBER",
            })),
          },
        },
      });
      return NextResponse.json({ conversation }, { status: 201 });
    }

    if (body.action === "message" && body.conversationId) {
      const content = body.content?.trim();
      if (!content || content.length > 3000) {
        return NextResponse.json({ error: "Escreva uma mensagem valida." }, { status: 400 });
      }
      const membership = await db.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: body.conversationId,
            userId,
          },
        },
      });
      if (!membership) return NextResponse.json({ error: "Conversa indisponivel." }, { status: 403 });
      const [message] = await db.$transaction([
        db.chatMessage.create({
          data: { conversationId: body.conversationId, userId, content },
        }),
        db.conversation.update({
          where: { id: body.conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ message }, { status: 201 });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error) {
    console.error("Falha em acao da comunidade", error);
    return NextResponse.json({ error: "Comunidade indisponivel no momento." }, { status: 503 });
  }
}
