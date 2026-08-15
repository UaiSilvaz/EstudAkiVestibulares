import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

async function main() {
  const { db } = await import("../src/lib/db");
  const stamp = Date.now();
  const emailA = `qa-a-${stamp}@estudaki.test`;
  const emailB = `qa-b-${stamp}@estudaki.test`;
  let temporaryProductId: string | null = null;
  let temporaryMaterialId: string | null = null;

  async function login(email: string, name: string) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "Teste@123", name }),
    });
    if (!response.ok) throw new Error(`Login ${email}: HTTP ${response.status}`);
    return response.headers.get("set-cookie")!.split(";")[0];
  }

  async function api(cookie: string, path: string, init: RequestInit = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, cookie },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  const results: Record<string, unknown> = {};
  try {
    const cookieA = await login(emailA, "Aluno Teste A");
    const cookieB = await login(emailB, "Aluno Teste B");
    const userA = await db.user.findUniqueOrThrow({ where: { email: emailA } });
    const userB = await db.user.findUniqueOrThrow({ where: { email: emailB } });

    const plan = await api(cookieA, "/api/study-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ availableDays: [1, 3, 5], minutesPerDay: 75 }),
    });
    const task = plan.tasks?.[0];
    if (!task) throw new Error("O cronograma não gerou tarefas.");
    const completed = await api(cookieA, "/api/study-plan", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId: task.id, completed: true }),
    });
    results.cronograma = {
      tasks: plan.tasks.length,
      completed: Boolean(completed.task.completedAt),
    };

    let product = await db.product.findFirst({ where: { status: "PUBLISHED" } });
    if (!product) {
      const material = await db.material.create({
        data: {
          title: "Material QA",
          category: "Teste",
          description: "Material temporário",
          priceCents: 100,
          status: "PUBLISHED",
        },
      });
      temporaryMaterialId = material.id;
      product = await db.product.create({
        data: {
          materialId: material.id,
          name: "Produto QA",
          slug: `produto-qa-${stamp}`,
          description: "Produto temporário",
          priceCents: 100,
          status: "PUBLISHED",
        },
      });
      temporaryProductId = product.id;
    }
    const cart = await api(cookieA, "/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product.id, status: "CART" }),
    });
    const moved = await api(cookieA, "/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: cart.item.id, status: "WISHLIST", quantity: 2 }),
    });
    const removed = await api(cookieA, `/api/cart?id=${cart.item.id}`, {
      method: "DELETE",
    });
    results.carrinho = {
      moved: moved.item.status,
      quantity: moved.item.quantity,
      removed: removed.removed,
    };

    const made = await api(cookieA, "/api/flashcards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        front: "Pergunta QA",
        back: "Resposta QA",
        deck: "Deck QA",
        shared: false,
      }),
    });
    const favored = await api(cookieA, `/api/flashcards/${made.card.id}/favorite`, {
      method: "POST",
    });
    const shared = await api(cookieA, "/api/flashcards", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: made.card.id, shared: true }),
    });
    results.flashcards = {
      favorite: favored.favorite,
      shared: shared.card.shared,
    };

    const form = new FormData();
    form.set("theme", "Desafios para ampliar a educação científica no Brasil");
    form.set(
      "text",
      "A educação científica é essencial para a sociedade brasileira. Em primeiro lugar, escolas precisam ampliar atividades práticas e formar professores. Além disso, políticas públicas devem democratizar laboratórios. Portanto, o Ministério da Educação deve financiar projetos, com metas e acompanhamento, para garantir formação crítica aos estudantes.",
    );
    const essay = await api(cookieA, "/api/essays/evaluate", {
      method: "POST",
      body: form,
    });
    results.redacao = {
      score: essay.evaluation.score,
      competencies: essay.evaluation.competencies.length,
      persisted: Boolean(essay.submission.id),
    };

    const post = await api(cookieA, "/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "post",
        content: "Publicação temporária de integração.",
      }),
    });
    const liked = await api(cookieB, "/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "like", postId: post.post.id }),
    });
    const conversation = await api(cookieA, "/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "conversation",
        memberIds: [userB.id],
        isGroup: false,
      }),
    });
    await api(cookieA, "/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "message",
        conversationId: conversation.conversation.id,
        content: "Mensagem de teste integrada.",
      }),
    });
    const inbox = await api(cookieB, "/api/community");
    const received = inbox.conversations.some(
      (item: { id: string; messages: Array<{ content: string }> }) =>
        item.id === conversation.conversation.id &&
        item.messages.some(
          (message) => message.content === "Mensagem de teste integrada.",
        ),
    );
    results.comunidade = {
      post: Boolean(post.post.id),
      liked: liked.liked,
      received,
    };

    await db.userProduct.create({
      data: { userId: userA.id, productId: product.id },
    });
    const license = await db.userProduct.findUnique({
      where: { userId_productId: { userId: userA.id, productId: product.id } },
      include: { product: { include: { material: true } } },
    });
    results.biblioteca = {
      purchasedMaterial: license?.product.material.title ?? null,
    };
    results.importacao = {
      ankiCards: await db.flashcard.count({ where: { source: "ANKI_DATA" } }),
    };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await db.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    if (temporaryProductId) {
      await db.product.deleteMany({ where: { id: temporaryProductId } });
    }
    if (temporaryMaterialId) {
      await db.material.deleteMany({ where: { id: temporaryMaterialId } });
    }
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
