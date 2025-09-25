"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { columns, User } from "./_components/columns";
import { DataTable } from "@/components/ui/data-table";
import { EditUserDialog } from "./_components/edit-user-dialog";
import { CreateUserDialog } from "./_components/create-user-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UsersPage() {
  const searchParams = useSearchParams();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const page = searchParams.get("page") ?? "1";
  const per_page = searchParams.get("per_page") ?? "10";
  const sort = searchParams.get("sort");
  const email = searchParams.get("email");
  const role = searchParams.get("role");

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
    `/api/admin/users?${createQueryString({ page, per_page, sort, email, role })}`,
    fetcher
  );

  // Fix: Add proper null checks
  const users = useMemo(() => data?.users ?? [], [data]);
  const roles = useMemo(() => 
    data?.roles?.map((role: { id: string; name: string }) => ({ 
      label: role.name, 
      value: role.id 
    })) ?? [], 
  [data]);
  const pageCount = useMemo(() => data?.pageCount ?? 0, [data]);

  async function onDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    await fetch(`/api/admin/users`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      }
    );
    mutate(`/api/admin/users?${createQueryString({ page, per_page, sort, email, role })}`);
  }

  if (error) return <div className="p-6 text-red-600">Failed to load</div>;

  return (
    <div className="p-6 space-y-6 dark:text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          roles={roles}
          pageCount={pageCount}
          searchColumn="email"
          onNewClick={() => setCreateOpen(true)}
          meta={{
            onEdit: (user: User) => setEditUser(user),
            onDelete,
          }}
        />
      )}
      <EditUserDialog
        user={editUser}
        roles={roles}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        onUserUpdated={() => {
          setEditUser(null);
          mutate(`/api/admin/users?${createQueryString({ page, per_page, sort, email, role })}`);
        }}
      />
      <CreateUserDialog
        roles={roles}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onUserCreated={() => {
          setCreateOpen(false);
          mutate(`/api/admin/users?${createQueryString({ page, per_page, sort, email, role })}`);
        }}
      />
    </div>
  );
}