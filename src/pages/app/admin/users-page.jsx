import { useDeferredValue, useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionDialog, QueryState } from "@/features/admin/admin-components";
import { useAuth } from "@/features/auth/auth-provider";
import { Pagination } from "@/features/dashboard/pagination";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatDate, formatDateTime } from "@/lib/format";

const ALL = "all";
const PAGE_SIZE = 20;

/** What each user action does, for the confirmation dialog. */
export function describeAction(action) {
  if (!action) return {};
  const { user, kind } = action;
  switch (kind) {
    case "suspend":
      return {
        title: `Suspend ${user.email}?`,
        description:
          "They're signed out everywhere immediately and can't log in or use the API. Their data is kept.",
        confirmLabel: "Suspend",
        destructive: true,
        reasonRequired: true,
        request: (reason) => adminApi.patch(`/admin/users/${user.id}/`, { is_active: false, reason }),
      };
    case "reactivate":
      return {
        title: `Reactivate ${user.email}?`,
        description: "They'll be able to log in again.",
        confirmLabel: "Reactivate",
        request: (reason) => adminApi.patch(`/admin/users/${user.id}/`, { is_active: true, reason }),
      };
    case "promote":
      return {
        title: `Make ${user.email} an administrator?`,
        description: "Administrators can change users, plans, AI settings and refunds.",
        confirmLabel: "Make administrator",
        reasonRequired: true,
        request: (reason) => adminApi.patch(`/admin/users/${user.id}/`, { role: "admin", reason }),
      };
    case "demote":
      return {
        title: `Remove administrator access from ${user.email}?`,
        description: "They keep their account but lose access to administration.",
        confirmLabel: "Remove access",
        destructive: true,
        request: (reason) => adminApi.patch(`/admin/users/${user.id}/`, { role: "user", reason }),
      };
    case "revoke":
      return {
        title: `Sign ${user.email} out everywhere?`,
        description:
          "Every session ends now, including access tokens already issued. They can log in again.",
        confirmLabel: "Sign out everywhere",
        destructive: true,
        request: (reason) => adminApi.post(`/admin/users/${user.id}/revoke-sessions/`, { reason }),
      };
    default:
      return {};
  }
}

function UserActions({ user, onAction }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Actions for ${user.email}`}>
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/app/admin/users/${user.id}`}>View account</Link>
        </DropdownMenuItem>
        {user.is_active ? (
          <DropdownMenuItem onSelect={() => onAction({ kind: "suspend", user })}>Suspend</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction({ kind: "reactivate", user })}>
            Reactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onAction({ kind: "revoke", user })}>
          Sign out everywhere
        </DropdownMenuItem>
        {user.role === "admin" ? (
          <DropdownMenuItem onSelect={() => onAction({ kind: "demote", user })}>
            Remove administrator
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction({ kind: "promote", user })}>
            Make administrator
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminUsersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [role, setRole] = useState(ALL);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const query = useAdminQuery("/admin/users/", {
    search: deferredSearch,
    status: status === ALL ? null : status,
    role: role === ALL ? null : role,
    page,
  });
  const [action, setAction] = useState(null);
  const copy = describeAction(action);
  const mutation = useAdminMutation((reason) => copy.request(reason));

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
        <div className="grid gap-2">
          <Label htmlFor="user-search">Search</Label>
          <Input
            id="user-search"
            type="search"
            placeholder="Email or name"
            value={search}
            onChange={(event) => resetPage(setSearch)(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="user-status">Status</Label>
          <Select value={status} onValueChange={resetPage(setStatus)}>
            <SelectTrigger id="user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="user-role">Role</Label>
          <Select value={role} onValueChange={resetPage(setRole)}>
            <SelectTrigger id="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <QueryState
        query={query}
        isEmpty={(data) => data.count === 0}
        empty={<EmptyState title="No users match" description="Try a different search or filter." />}
      >
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <caption className="sr-only">Users</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Subscription</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="hidden lg:table-cell">Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="max-w-56">
                        <Link
                          to={`/app/admin/users/${user.id}`}
                          className="block truncate font-medium hover:text-primary"
                        >
                          {user.email}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.full_name || "No name"}
                          {user.has_byok_key ? " · own API key" : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={user.is_active ? "success" : "destructive"}>
                            {user.is_active ? "Active" : "Suspended"}
                          </Badge>
                          {user.role === "admin" ? <Badge>Admin</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.subscription_ends_at ? `Until ${formatDate(user.subscription_ends_at)}` : "None"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(user.date_joined)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.last_login ? formatDateTime(user.last_login) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id === me.id ? (
                          <span className="text-sm text-muted-foreground">You</span>
                        ) : (
                          <UserActions user={user} onAction={setAction} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page}
              count={data.count}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              isFetching={query.isFetching}
              label="User pages"
            />
          </>
        )}
      </QueryState>

      <ActionDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirmLabel}
        destructive={copy.destructive}
        reasonRequired={copy.reasonRequired}
        onConfirm={(reason) => mutation.mutateAsync(reason)}
      />
    </div>
  );
}

export default AdminUsersPage;
