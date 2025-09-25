"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield as ShieldIcon, Loader2 } from "lucide-react";
import { columns, Role } from "./_components/columns";
import { DataTable } from "@/components/ui/data-table";
import { EditRoleDialog } from "./_components/edit-role-dialog";
import { CreateRoleDialog } from "./_components/create-role-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RolesManagementPage() {
  const searchParams = useSearchParams();
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const page = searchParams.get("page") ?? "1";
  const per_page = searchParams.get("per_page") ?? "10";
  const sort = searchParams.get("sort");
  const name = searchParams.get("name");

  const createQueryString = (params: Record<string, string | number | null>) => {
    const newSearchParams = new URLSearchParams(searchParams?.toString());

    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, String(value));
      }
    }

    return newSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR(
    `/api/admin/roles?${createQueryString({ page, per_page, sort, name })}`,
    fetcher
  );

  const roles = useMemo(() => data?.roles ?? [], [data]);
  const permissions = useMemo(() => data?.permissions ?? [], [data]);
  const pageCount = useMemo(() => data?.pageCount ?? 0, [data]);

  async function onDelete(roleId: string) {
    if (!confirm("Are you sure you want to delete this role?")) return;

    await fetch(`/api/admin/roles/${roleId}`, {
      method: "DELETE",
    });
    mutate(`/api/admin/roles?${createQueryString({ page, per_page, sort, name })}`);
  }

  if (error) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Roles</h1>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={roles}
          pageCount={pageCount}
          searchColumn="name"
          onNewClick={() => setCreateOpen(true)}
          meta={{
            onEdit: (role: Role) => setEditRole(role),
            onDelete,
          }}
        />
      )}
      <CreateRoleDialog
        permissions={permissions}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onRoleCreated={() => {
          setCreateOpen(false);
          mutate(`/api/admin/roles?${createQueryString({ page, per_page, sort, name })}`);
        }}
      />
      <EditRoleDialog
        role={editRole}
        permissions={permissions}
        open={!!editRole}
        onOpenChange={(open) => !open && setEditRole(null)}
        onRoleUpdated={() => {
          setEditRole(null);
          mutate(`/api/admin/roles?${createQueryString({ page, per_page, sort, name })}`);
        }}
      />
    </div>
  );
}
