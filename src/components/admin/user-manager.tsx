"use client";

import { Role } from "@prisma/client";
import { CheckCircle2, Crown, Download, ExternalLink, Loader2, LockKeyhole, ShieldCheck, ShoppingBag, Trash2, Unlock, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  xp: number;
  streak: number;
  league: string;
  weeklyHours: number | null;
  targetExam: string | null;
  createdAt: string;
  purchases: Array<{
    id: string;
    buyerEmail: string;
    status: string;
    createdAt: string;
    product: { name: string; priceCents: number; checkoutUrl: string | null };
  }>;
  licenses: Array<{
    id: string;
    unlockedAt: string;
    progress: number;
    product: { name: string; slug: string; priceCents: number };
  }>;
  cartItems: Array<{
    id: string;
    status: string;
    quantity: number;
    product: { name: string; priceCents: number };
  }>;
  _count: {
    attempts: number;
    achievements: number;
    studySessions: number;
    purchases: number;
    licenses: number;
  };
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  checkoutUrl: string | null;
  material: { title: string; fileUrl: string | null; premium: boolean };
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordenador",
  MENTOR: "Mentor",
  TEACHER: "Professor",
  STUDENT: "Aluno",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function count(user: UserRow, key: keyof UserRow["_count"]) {
  return user._count?.[key] ?? 0;
}

export function UserManager() {
  const { confirm, notify } = useFeedback();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as { users?: UserRow[]; products?: ProductRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar usuarios.");
      setUsers(payload.users ?? []);
      setProducts(payload.products ?? []);
      if (!selectedProductId && payload.products?.[0]) setSelectedProductId(payload.products[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      setLoadError(message);
      notify({
        tone: "error",
        title: "Usuarios indisponiveis",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${roleLabels[user.role]} ${user.targetExam ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [search, users]);

  const totals = useMemo(
    () => ({
      admins: users.filter((user) => user.role === Role.ADMIN).length,
      purchases: users.reduce((sum, user) => sum + count(user, "purchases"), 0),
      licenses: users.reduce((sum, user) => sum + count(user, "licenses"), 0),
    }),
    [users],
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedAccessCount = selectedProductId
    ? users.filter((user) => user.licenses.some((license) => license.product.slug === selectedProduct?.slug)).length
    : 0;

  async function updateRole(user: UserRow, role: Role) {
    setBusyId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Nao foi possivel atualizar.");
      notify({
        tone: "success",
        title: "Usuario atualizado",
        message: `${user.email} agora esta como ${roleLabels[role]}.`,
      });
      await loadUsers();
    } catch (error) {
      notify({
        tone: "error",
        title: "Alteracao nao aplicada",
        message: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: UserRow) {
    const accepted = await confirm({
      tone: "danger",
      title: "Excluir usuario?",
      message: `Isso remove ${user.email} e os dados vinculados por cascata. Use apenas quando tiver certeza.`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
    });
    if (!accepted) return;

    setBusyId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Nao foi possivel excluir.");
      notify({ tone: "success", title: "Usuario excluido", message: user.email });
      await loadUsers();
    } catch (error) {
      notify({
        tone: "error",
        title: "Exclusao bloqueada",
        message: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function updatePdfAccess(user: UserRow, licenseAction: "grant" | "revoke") {
    if (!selectedProductId) {
      notify({ tone: "warning", title: "Selecione um material" });
      return;
    }

    setBusyId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, licenseAction }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Nao foi possivel atualizar o acesso.");
      notify({
        tone: "success",
        title: licenseAction === "grant" ? "PDF liberado" : "PDF restringido",
        message: user.email,
      });
      await loadUsers();
    } catch (error) {
      notify({
        tone: "error",
        title: "Acesso nao atualizado",
        message: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">Usuarios</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-violet-700">Admins</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{totals.admins}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Compras/licencas</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {totals.purchases}/{totals.licenses}
          </p>
        </div>
      </section>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="ek-input w-full"
        placeholder="Buscar por nome, email, papel ou vestibular..."
      />

      <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 shadow-[0_18px_42px_-28px_rgba(249,115,22,0.26)] md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">Controle de acesso aos materiais</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Liberar ou restringir PDF por usuario</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Escolha um material e use os botoes em cada aluno. A biblioteca do aluno atualiza assim que o acesso e liberado.
            </p>
          </div>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="ek-input bg-white"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {money(product.priceCents)}
              </option>
            ))}
          </select>
        </div>
        {selectedProduct && (
          <div className="mt-4 grid gap-3 rounded-[22px] border border-white/80 bg-white/85 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {selectedAccessCount} liberado(s)
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                  {money(selectedProduct.priceCents)}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-black text-slate-950">{selectedProduct.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{selectedProduct.material.title}</p>
            </div>
            {selectedProduct.material.fileUrl && (
              <div className="flex flex-wrap gap-2 md:justify-end">
            <a
              href={selectedProduct.material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="ek-button bg-white text-orange-700 hover:bg-orange-100"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir PDF selecionado
            </a>
            <a
              href={`${selectedProduct.material.fileUrl}?download=1`}
              target="_blank"
              rel="noreferrer"
              className="ek-button border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              Baixar PDF selecionado
            </a>
          </div>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-100 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center">
          <p className="text-lg font-black text-rose-800">Nao foi possivel carregar os usuarios.</p>
          <p className="mt-2 text-sm font-semibold text-rose-700">{loadError}</p>
          <button type="button" onClick={() => void loadUsers()} className="ek-button ek-button-primary mt-4">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.18)]"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-950">{user.name}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {roleLabels[user.role]}
                    </span>
                    {user.role === Role.ADMIN && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                        <Crown className="h-3 w-3" />
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{user.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-full bg-slate-50 px-3 py-1">{user.xp} XP</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">{user.streak} dias</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">Liga {user.league}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      {user.targetExam ?? "ENEM"} · {user.weeklyHours ?? 0}h/sem
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  <select
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={(event) => void updateRole(user, event.target.value as Role)}
                    className="ek-input min-w-44"
                    aria-label={`Alterar papel de ${user.email}`}
                  >
                    {Object.values(Role).map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyId === user.id || user.role === Role.ADMIN}
                    onClick={() => void updateRole(user, Role.ADMIN)}
                    className="ek-button ek-button-ghost"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Promover
                  </button>
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => void deleteUser(user)}
                    className="ek-button border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-orange-100 bg-orange-50 p-3">
                {selectedProduct && (
                  <span
                    className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-xs font-black ${
                      user.licenses.some((license) => license.product.slug === selectedProduct.slug)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {user.licenses.some((license) => license.product.slug === selectedProduct.slug) ? (
                      <Unlock className="h-4 w-4" />
                    ) : (
                      <LockKeyhole className="h-4 w-4" />
                    )}
                    {user.licenses.some((license) => license.product.slug === selectedProduct.slug)
                      ? "Material liberado"
                      : "Sem acesso"}
                  </span>
                )}
                <button
                  type="button"
                  disabled={busyId === user.id || !selectedProductId}
                  onClick={() => void updatePdfAccess(user, "grant")}
                  className="ek-button bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  <Unlock className="h-4 w-4" />
                  Liberar para este usuario
                </button>
                <button
                  type="button"
                  disabled={busyId === user.id || !selectedProductId}
                  onClick={() => void updatePdfAccess(user, "revoke")}
                  className="ek-button border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Bloquear acesso
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <UserMetric icon={<UserCog className="h-4 w-4" />} label="Atividades" value={`${count(user, "attempts")} respostas`} />
                <UserMetric icon={<ShoppingBag className="h-4 w-4" />} label="Compras" value={`${count(user, "purchases")} pedidos`} />
                <UserMetric icon={<ShieldCheck className="h-4 w-4" />} label="Licencas" value={`${count(user, "licenses")} acessos`} />
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <UserDetailList
                  title="Compras recentes"
                  empty="Nenhuma compra registrada."
                  items={(user.purchases ?? []).map((purchase) => (
                    <span key={purchase.id}>
                      {purchase.product.name} · {purchase.status} · {money(purchase.product.priceCents)}
                    </span>
                  ))}
                />
                <UserDetailList
                  title="Planos e materiais liberados"
                  empty="Nenhuma licenca ativa."
                  items={(user.licenses ?? []).map((license) => (
                    <span key={license.id}>
                      {license.product.name} · {Math.round(license.progress * 100)}% lido
                    </span>
                  ))}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function UserDetailList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: React.ReactNode[];
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
        {items.length ? items.slice(0, 3).map((item, index) => <p key={index}>{item}</p>) : <p>{empty}</p>}
      </div>
    </div>
  );
}
