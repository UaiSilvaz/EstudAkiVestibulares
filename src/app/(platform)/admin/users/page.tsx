import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { UserManager } from "@/components/admin/user-manager";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export default async function AdminUsersPage() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) redirect("/admin");

  return (
    <div>
      <PageHeader
        eyebrow="Usuários e acessos"
        title="Administração de contas"
        description="Promova usuários, remova contas, confira compras, licenças, carrinho, progresso e dados essenciais do aluno."
      />
      <UserManager />
    </div>
  );
}
