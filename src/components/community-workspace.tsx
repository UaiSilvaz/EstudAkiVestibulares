"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  FileText,
  Flame,
  Folder,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";

type Tab = "feed" | "chats" | "people";
type User = { id: string; name: string; avatarUrl: string | null; league: string; xp?: number };
type CurrentUser = { id: string; name: string; avatarUrl: string | null; league: string; xp: number; streak: number };
type Post = { id: string; content: string; createdAt: string; user: User; liked: boolean; likeCount: number };
type Message = { id: string; content: string; createdAt: string; userId: string; user: Pick<User, "id" | "name" | "avatarUrl"> };
type Conversation = { id: string; title: string | null; isGroup: boolean; members: Array<{ user: User }>; messages: Message[] };
type Payload = { posts: Post[]; conversations: Conversation[]; users: User[]; safeMode?: boolean };

export function CommunityWorkspace({ currentUser }: { currentUser: CurrentUser }) {
  const { notify } = useFeedback();
  const currentUserId = currentUser.id;
  const [tab, setTab] = useState<Tab>("chats");
  const [data, setData] = useState<Payload>({ posts: [], conversations: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState("");
  const [search, setSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (query = "") => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/community${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as (Payload & { error?: string }) | null;
        if (!response.ok) throw new Error(payload?.error ?? "Comunidade indisponivel.");
        if (payload) {
          setData(payload);
          setActiveConversationId((current) =>
            current && payload.conversations.some((conversation) => conversation.id === current)
              ? current
              : payload.conversations[0]?.id ?? null,
          );
          if (payload.safeMode) setLoadError("Modo leve ativado: o feed abriu sem derrubar a tela.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel carregar a comunidade.";
        setLoadError(message);
        setData({ posts: [], conversations: [], users: [] });
        notify({ tone: "error", title: "Comunidade indisponivel", message });
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (tab !== "people") return;
    const timer = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(timer);
  }, [load, search, tab]);

  async function action(body: object) {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as { error?: string; conversation?: { id: string } } | null;
    if (!response.ok) {
      notify({ tone: "error", title: "Acao nao concluida", message: result?.error ?? "Tente novamente." });
      return null;
    }
    return result;
  }

  async function publish() {
    if (!post.trim()) return;
    const result = await action({ action: "post", content: post });
    if (!result) return;
    setPost("");
    await load();
    notify({ tone: "success", title: "Publicado com sucesso", message: "Sua atualizacao ja aparece na comunidade." });
  }

  async function like(postId: string) {
    const result = await action({ action: "like", postId });
    if (!result) return;
    setData((current) => ({
      ...current,
      posts: current.posts.map((item) =>
        item.id === postId
          ? { ...item, liked: !item.liked, likeCount: item.likeCount + (item.liked ? -1 : 1) }
          : item,
      ),
    }));
  }

  async function createConversation(memberIds: string[], isGroup = false) {
    const result = await action({ action: "conversation", memberIds, isGroup, title: groupTitle });
    if (!result?.conversation) return;
    setSelectedUsers([]);
    setGroupTitle("");
    setGroupMode(false);
    await load();
    setActiveConversationId(result.conversation.id);
    setTab("chats");
    notify({ tone: "success", title: isGroup ? "Grupo criado" : "Conversa iniciada" });
  }

  async function sendMessage() {
    if (!activeConversationId || !message.trim()) return;
    const result = await action({ action: "message", conversationId: activeConversationId, content: message });
    if (!result) return;
    setMessage("");
    await load();
  }

  const filteredConversations = useMemo(() => {
    const normalized = chatSearch.trim().toLowerCase();
    if (!normalized) return data.conversations;
    return data.conversations.filter((conversation) => {
      const title = getConversationTitle(conversation, currentUserId).toLowerCase();
      return title.includes(normalized) || conversation.messages.some((item) => item.content.toLowerCase().includes(normalized));
    });
  }, [chatSearch, currentUserId, data.conversations]);

  const activeConversation = data.conversations.find((item) => item.id === activeConversationId) ?? null;
  const activeTitle = getConversationTitle(activeConversation, currentUserId);
  const activeMembers = activeConversation?.members.map((member) => member.user) ?? [];
  const topUsers = data.users.slice(0, 5);
  const sharedCounts = getSharedCounts(activeConversation);

  const quickActions = [
    { label: "Conversa rapida", detail: "Inicie um papo", icon: MessageCircle, tab: "chats" as Tab, tone: "from-violet-600 to-blue-600", surface: "border-violet-100 bg-violet-50/80 text-violet-700" },
    { label: "Grupos ativos", detail: `${data.conversations.length} conversas`, icon: Users, tab: "chats" as Tab, tone: "from-emerald-500 to-cyan-500", surface: "border-emerald-100 bg-emerald-50/80 text-emerald-700" },
    { label: "Destaques", detail: `${data.posts.length} posts`, icon: Star, tab: "feed" as Tab, tone: "from-amber-400 to-orange-500", surface: "border-amber-100 bg-amber-50/80 text-orange-700" },
    { label: "Pessoas", detail: "Criar grupo", icon: GraduationCap, tab: "people" as Tab, tone: "from-blue-500 to-cyan-400", surface: "border-blue-100 bg-blue-50/80 text-blue-700" },
  ];

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(116deg,#ffffff_0%,#f7f5ff_46%,#ecfeff_100%)] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.32)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2563EB_0%,#22D3EE_45%,#F97316_100%)]" aria-hidden />
        <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/86 px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              Comunidade
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-3xl font-black leading-tight text-[#0F172A] md:text-4xl">
              Converse com sua comunidade de estudos
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Troque ideias, tire duvidas, compartilhe materiais e evolua junto com outros estudantes.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTab(item.tab)}
                    className={cn(
                      "group flex min-h-[86px] items-center gap-3 rounded-[22px] border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                      item.surface,
                    )}
                  >
                    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", item.tone)}>
                      <Icon className="h-5 w-5" strokeWidth={2.6} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[#0F172A]">{item.label}</span>
                      <span className="mt-1 block truncate text-xs font-bold text-slate-500">{item.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-70 transition group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="relative min-h-[270px] overflow-hidden rounded-[28px] border border-blue-100 bg-white/78 p-4 shadow-[0_20px_42px_-30px_rgba(37,99,235,0.38)]">
            <div className="relative z-10 flex items-center gap-3">
              <Avatar user={currentUser} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{currentUser.name}</p>
                <p className="text-xs font-bold text-blue-700">Seu ritmo na comunidade</p>
              </div>
            </div>
            <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
              <HeroStat icon={Trophy} label="Seu XP" value={currentUser.xp.toLocaleString("pt-BR")} tone="text-amber-600" />
              <HeroStat icon={Flame} label="Dias seguidos" value={`${currentUser.streak}d`} tone="text-orange-600" />
              <HeroStat icon={ShieldCheck} label="Liga" value={currentUser.league} tone="text-blue-700" />
              <HeroStat icon={Zap} label="Conversas" value={data.conversations.length.toLocaleString("pt-BR")} tone="text-cyan-600" />
            </div>
            <ChatIllustration />
          </aside>
        </div>
      </section>

      <nav className="sticky top-2 z-20 flex gap-2 overflow-x-auto rounded-[24px] border border-white/80 bg-white/92 p-2 shadow-sm backdrop-blur-xl">
        {[
          { id: "feed", label: "Feed", icon: MessageCircle },
          { id: "chats", label: "Conversas", icon: Send },
          { id: "people", label: "Pessoas e grupos", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as Tab)}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs font-black transition",
                active ? "bg-blue-600 text-white shadow-[0_14px_24px_-14px_rgba(37,99,235,0.72)]" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {loading && (
        <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-blue-100 bg-white/70">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {loadError}
        </div>
      )}

      {!loading && tab === "feed" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <Avatar user={currentUser} />
                <textarea
                  value={post}
                  onChange={(event) => setPost(event.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder="Compartilhe uma duvida, conquista ou dica de estudo..."
                  className="min-h-[104px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">{post.length}/1200</span>
                <button disabled={!post.trim()} onClick={() => void publish()} className="ek-button ek-button-primary !min-h-10 !px-4 !py-2 text-xs">
                  Publicar
                </button>
              </div>
            </div>

            {data.posts.map((item) => (
              <article key={item.id} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.24)]">
                <div className="flex items-center gap-3">
                  <Avatar user={item.user} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{item.user.name}</p>
                    <p className="text-xs font-bold text-blue-600">
                      {item.user.league} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{item.content}</p>
                <button
                  type="button"
                  onClick={() => void like(item.id)}
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition",
                    item.liked ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700",
                  )}
                >
                  <Heart className="h-4 w-4" fill={item.liked ? "currentColor" : "none"} />
                  {item.likeCount}
                </button>
              </article>
            ))}
            {!data.posts.length && <Empty text="Ainda nao ha publicacoes. Comece a conversa." />}
          </section>

          <aside className="h-fit rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Trophy className="h-5 w-5 text-amber-500" />
              Destaques ativos
            </h2>
            <div className="mt-4 space-y-3">
              {topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-700 shadow-sm">{index + 1}</span>
                  <Avatar user={user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                    <p className="text-xs font-bold text-orange-600">{(user.xp ?? 0).toLocaleString("pt-BR")} XP</p>
                  </div>
                </div>
              ))}
              {!topUsers.length && <p className="text-sm font-semibold text-slate-500">Sem destaques por enquanto.</p>}
            </div>
          </aside>
        </div>
      )}

      {!loading && tab === "chats" && (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="min-h-[620px] rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950">Conversas</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab("people")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Buscar conversas..."
                className="ek-input ek-input-with-icon !rounded-2xl !py-3 text-sm"
              />
            </label>

            <div className="thin-scrollbar mt-4 max-h-[510px] space-y-2 overflow-y-auto pr-1">
              {filteredConversations.map((conversation, index) => {
                const title = getConversationTitle(conversation, currentUserId);
                const lastMessage = getLastMessage(conversation);
                const active = activeConversationId === conversation.id;
                const previewUser = conversation.isGroup
                  ? null
                  : conversation.members.find((member) => member.user.id !== currentUserId)?.user ?? conversation.members[0]?.user;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[22px] p-3 text-left transition",
                      active ? "bg-[linear-gradient(135deg,#eef2ff_0%,#e0f2fe_100%)] shadow-sm ring-1 ring-blue-100" : "hover:bg-slate-50",
                    )}
                  >
                    {conversation.isGroup ? (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-md">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                    ) : (
                      <Avatar user={previewUser ?? currentUser} size="md" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-slate-950">{title}</span>
                        <span className="text-[10px] font-bold text-slate-400">{lastMessage ? formatTime(lastMessage.createdAt) : ""}</span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{lastMessage?.content ?? "Sem mensagens ainda"}</span>
                    </span>
                    {index < 3 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                        {3 - index}
                      </span>
                    )}
                  </button>
                );
              })}
              {!filteredConversations.length && <Empty text="Busque um colega para comecar." compact />}
            </div>
          </aside>

          <section className="flex min-h-[620px] overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-md">
                    {activeConversation?.isGroup ? <GraduationCap className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950">{activeTitle}</h2>
                    <p className="text-xs font-bold text-slate-500">
                      {activeMembers.length ? `${activeMembers.length} participante${activeMembers.length > 1 ? "s" : ""}` : "Selecione uma conversa"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <IconButton label="Buscar na conversa" icon={Search} />
                  <IconButton label="Chamar" icon={Phone} />
                  <IconButton label="Mais opcoes" icon={MoreVertical} />
                </div>
              </header>

              <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
                {activeConversation?.messages.map((item) => {
                  const mine = item.userId === currentUserId;
                  return (
                    <div key={item.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                      {!mine && <Avatar user={item.user} size="sm" />}
                      <div
                        className={cn(
                          "max-w-[82%] rounded-[22px] px-4 py-3 text-sm shadow-sm",
                          mine
                            ? "rounded-br-md bg-[linear-gradient(135deg,#dbeafe_0%,#bfdbfe_100%)] text-slate-900"
                            : "rounded-bl-md border border-slate-100 bg-white text-slate-700",
                        )}
                      >
                        {!mine && <p className="mb-1 text-xs font-black text-blue-700">{item.user.name}</p>}
                        <p className="whitespace-pre-wrap font-semibold leading-5">{item.content}</p>
                        <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px] font-bold", mine ? "text-blue-600" : "text-slate-400")}>
                          {formatTime(item.createdAt)}
                          {mine && <CheckCheck className="h-3.5 w-3.5" />}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!activeConversation?.messages.length && <Empty text="Ainda nao ha mensagens nesta conversa." compact />}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
                className="flex items-center gap-2 border-t border-slate-100 p-3"
              >
                <IconButton label="Anexar" icon={Paperclip} />
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="ek-input min-w-0 flex-1 !rounded-2xl !py-3 text-sm"
                />
                <IconButton label="Emoji" icon={Smile} />
                <button
                  type="submit"
                  disabled={!activeConversation || !message.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_24px_-14px_rgba(37,99,235,0.75)] transition hover:bg-blue-700 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-200 to-blue-100 text-violet-700 shadow-[0_18px_36px_-24px_rgba(79,70,229,0.5)]">
                  {activeConversation?.isGroup ? <GraduationCap className="h-9 w-9" /> : <MessageCircle className="h-8 w-8" />}
                </span>
                <h3 className="mt-3 text-lg font-black text-slate-950">{activeTitle}</h3>
                <p className="mt-1 max-w-[240px] text-sm font-semibold leading-5 text-slate-500">
                  Espaco para trocar dicas, materiais e duvidas com quem estuda no mesmo ritmo.
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-black text-slate-700">{activeMembers.length} participantes</p>
                <div className="mt-2 flex -space-x-2">
                  {activeMembers.slice(0, 5).map((user) => (
                    <Avatar key={user.id} user={user} size="sm" className="ring-2 ring-white" />
                  ))}
                  {activeMembers.length > 5 && (
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-100 px-2 text-xs font-black text-slate-500 ring-2 ring-white">
                      +{activeMembers.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniStat icon={Folder} label="Mensagens" value={sharedCounts.messages} tone="text-blue-600" />
                <MiniStat icon={LinkIcon} label="Links" value={sharedCounts.links} tone="text-violet-600" />
                <MiniStat icon={BookOpen} label="Materiais" value={sharedCounts.materials} tone="text-orange-600" />
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm font-black text-slate-700">Conteudos compartilhados</p>
                <div className="mt-3 space-y-2">
                  <SharedItem icon={FileText} label="PDFs e resumos" value={sharedCounts.materials} tone="bg-rose-50 text-rose-600" />
                  <SharedItem icon={LinkIcon} label="Links uteis" value={sharedCounts.links} tone="bg-violet-50 text-violet-600" />
                  <SharedItem icon={MessageCircle} label="Duvidas" value={sharedCounts.questions} tone="bg-blue-50 text-blue-600" />
                  <SharedItem icon={ImageIcon} label="Imagens" value={sharedCounts.images} tone="bg-emerald-50 text-emerald-600" />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
              <p className="text-sm font-black text-slate-950">Seu painel</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar user={currentUser} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{currentUser.name}</p>
                  <p className="text-xs font-bold text-orange-600">{currentUser.league}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat icon={Trophy} label="XP" value={currentUser.xp} tone="text-amber-600" />
                <MiniStat icon={Flame} label="Dias" value={currentUser.streak} tone="text-orange-600" />
              </div>
            </section>
          </aside>
        </div>
      )}

      {!loading && tab === "people" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario pelo nome"
                className="ek-input ek-input-with-icon w-full"
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.users.map((user) => (
                <article key={user.id} className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-slate-50/50 p-3">
                  <Avatar user={user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                    <p className="text-xs font-bold text-blue-600">
                      {user.league} · {(user.xp ?? 0).toLocaleString("pt-BR")} XP
                    </p>
                  </div>
                  {groupMode ? (
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() =>
                        setSelectedUsers((current) =>
                          current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id],
                        )
                      }
                      className="h-5 w-5 accent-blue-600"
                    />
                  ) : (
                    <button type="button" onClick={() => void createConversation([user.id])} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-[28px] border border-violet-100 bg-violet-50/70 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-violet-950">
              <Users className="h-5 w-5" />
              Criar grupo
            </h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-violet-700">Selecione colegas para uma sala de estudos.</p>
            {!groupMode ? (
              <button onClick={() => setGroupMode(true)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-black text-white">
                <Plus className="h-4 w-4" />
                Novo grupo
              </button>
            ) : (
              <>
                <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Nome do grupo" className="ek-input mt-4 w-full" />
                <p className="mt-2 text-xs font-bold text-violet-700">{selectedUsers.length} pessoa(s) selecionada(s)</p>
                <button
                  onClick={() => void createConversation(selectedUsers, true)}
                  disabled={!groupTitle.trim() || selectedUsers.length === 0}
                  className="mt-3 min-h-11 w-full rounded-2xl bg-violet-600 text-sm font-black text-white"
                >
                  Criar grupo
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, tone }: { icon: typeof Trophy; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white/86 p-3 shadow-sm">
      <Icon className={cn("h-4 w-4", tone)} />
      <p className="mt-2 text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="truncate text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function ChatIllustration() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 hidden h-32 w-44 sm:block" aria-hidden>
      <span className="absolute bottom-0 right-0 h-20 w-28 rounded-[22px] bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_18px_28px_-18px_rgba(37,99,235,0.8)]" />
      <span className="absolute bottom-6 right-8 h-3 w-14 rounded-full bg-white/70" />
      <span className="absolute bottom-11 right-8 h-3 w-20 rounded-full bg-white/50" />
      <span className="absolute bottom-20 right-12 h-16 w-28 rounded-[22px] bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_18px_28px_-18px_rgba(79,70,229,0.8)]" />
      <span className="absolute bottom-[106px] right-[72px] h-2.5 w-16 rounded-full bg-white/70" />
      <span className="absolute bottom-[106px] right-5 h-2.5 w-10 rounded-full bg-white/60" />
      <span className="absolute bottom-12 left-0 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_16px_26px_-16px_rgba(37,99,235,0.8)]">
        <Users className="h-6 w-6" />
      </span>
    </div>
  );
}

function IconButton({ label, icon: Icon }: { label: string; icon: typeof Search }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: typeof Trophy; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
      <Icon className={cn("mx-auto h-4 w-4", tone)} />
      <p className="mt-1 text-sm font-black text-slate-950">{value.toLocaleString("pt-BR")}</p>
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function SharedItem({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{label}</p>
        <p className="text-xs font-semibold text-slate-500">{value.toLocaleString("pt-BR")} itens</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function Avatar({ user, size = "md", className }: { user: Pick<User, "name" | "avatarUrl">; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl text-[10px]",
    md: "h-11 w-11 rounded-2xl text-xs",
    lg: "h-14 w-14 rounded-[20px] text-sm",
  };

  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt={user.name} className={cn("shrink-0 object-cover shadow-md", sizes[size], className)} />;
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 via-cyan-400 to-emerald-300 font-black text-white shadow-md", sizes[size], className)}>
      {initials(user.name)}
    </span>
  );
}

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <p className={cn("rounded-[22px] border border-dashed border-slate-200 bg-white text-center text-sm font-semibold text-slate-500", compact ? "p-5" : "p-10")}>
      {text}
    </p>
  );
}

function getConversationTitle(conversation: Conversation | null | undefined, currentUserId: string) {
  if (!conversation) return "Selecione uma conversa";
  if (conversation.isGroup) return conversation.title ?? "Grupo de estudos";
  return conversation.members.find((member) => member.user.id !== currentUserId)?.user.name ?? "Conversa";
}

function getLastMessage(conversation: Conversation) {
  return conversation.messages[conversation.messages.length - 1];
}

function getSharedCounts(conversation: Conversation | null) {
  const messages = conversation?.messages ?? [];
  return {
    messages: messages.length,
    links: messages.filter((item) => /https?:\/\//i.test(item.content)).length,
    materials: messages.filter((item) => /(pdf|resumo|material|apostila|arquivo)/i.test(item.content)).length,
    questions: messages.filter((item) => /\?/.test(item.content) || /duvida|questao/i.test(item.content)).length,
    images: messages.filter((item) => /\.(png|jpe?g|gif|webp)/i.test(item.content)).length,
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
