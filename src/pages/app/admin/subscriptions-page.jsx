import { useDeferredValue, useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionDialog, QueryState, fieldError } from "@/features/admin/admin-components";
import { Pagination } from "@/features/dashboard/pagination";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatDate, formatNumber } from "@/lib/format";

const ALL = "all";

const ALLOWANCES = [
  ["ai_token_quota", "AI tokens per period"],
  ["daily_ai_token_limit", "AI tokens per day"],
  ["interview_quota", "Interviews per period"],
  ["daily_interview_limit", "Interviews per day"],
  ["voice_seconds_quota", "Voice seconds per period"],
  ["daily_voice_seconds_limit", "Voice seconds per day"],
];

function stateOf(subscription) {
  if (subscription.status !== "active") return subscription.status;
  const now = Date.now();
  if (new Date(subscription.starts_at) > now) return "upcoming";
  if (new Date(subscription.ends_at) <= now) return "ended";
  return "current";
}

const STATE_BADGES = {
  current: ["Current", "success"],
  upcoming: ["Upcoming", "default"],
  ended: ["Ended", "neutral"],
  cancelled: ["Cancelled", "neutral"],
  revoked: ["Revoked", "destructive"],
};

/** Edit an existing subscription: only fields the admin changed are sent. */
function EditDialog({ subscription, onOpenChange }) {
  const initial = {
    ends_at: subscription.ends_at.slice(0, 10),
    ...Object.fromEntries(ALLOWANCES.map(([field]) => [field, subscription[field] ?? ""])),
  };
  const [values, setValues] = useState(initial);
  const [error, setError] = useState(null);
  const save = useAdminMutation((reason) => {
    const changes = {};
    for (const [field, value] of Object.entries(values)) {
      if (value === initial[field]) continue;
      if (field === "ends_at") {
        // Keep the original time of day; change only the date.
        changes.ends_at = `${value}${subscription.ends_at.slice(10)}`;
      } else {
        changes[field] = value === "" ? null : Number(value);
      }
    }
    return adminApi.patch(`/admin/subscriptions/${subscription.id}/`, { ...changes, reason });
  });

  return (
    <ActionDialog
      open
      onOpenChange={onOpenChange}
      title={`Edit subscription #${subscription.id}`}
      description={`${subscription.user_email} · started ${formatDate(subscription.starts_at)}. Plan versions aren't affected.`}
      confirmLabel="Save changes"
      onConfirm={(reason) =>
        save.mutateAsync(reason).catch((caught) => {
          setError(caught);
          throw caught;
        })
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="sub-ends">Ends on</Label>
          <Input
            id="sub-ends"
            type="date"
            value={values.ends_at}
            onChange={(event) => setValues({ ...values, ends_at: event.target.value })}
            aria-invalid={fieldError(error, "ends_at") ? true : undefined}
          />
        </div>
        {ALLOWANCES.map(([field, label]) => (
          <div key={field} className="grid gap-1.5">
            <Label htmlFor={`sub-${field}`}>{label}</Label>
            <Input
              id={`sub-${field}`}
              type="number"
              min={0}
              placeholder={field.startsWith("daily") ? "No daily limit" : ""}
              value={values[field]}
              onChange={(event) => setValues({ ...values, [field]: event.target.value })}
              aria-invalid={fieldError(error, field) ? true : undefined}
            />
          </div>
        ))}
      </div>
    </ActionDialog>
  );
}

export function SubscriptionsTable({ rows, showUser = false }) {
  const [editing, setEditing] = useState(null);
  const [statusChange, setStatusChange] = useState(null);
  const change = useAdminMutation(({ subscription, status, reason }) =>
    adminApi.patch(`/admin/subscriptions/${subscription.id}/`, { status, reason }),
  );

  if (!rows.length) return <EmptyState title="No subscriptions" />;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <caption className="sr-only">Subscriptions</caption>
          <TableHeader>
            <TableRow>
              {showUser ? <TableHead>User</TableHead> : null}
              <TableHead>Plan</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="hidden md:table-cell">Interviews</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((subscription) => {
              const state = stateOf(subscription);
              const [label, variant] = STATE_BADGES[state];
              return (
                <TableRow key={subscription.id}>
                  {showUser ? (
                    <TableCell className="max-w-48 truncate">
                      <Link to={`/app/admin/users/${subscription.user_id}`} className="hover:text-primary">
                        {subscription.user_email}
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {subscription.plan_name}
                    <span className="block text-xs text-muted-foreground">v{subscription.plan_version}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                    {subscription.revoke_reason ? (
                      <span className="mt-1 block text-xs text-muted-foreground">{subscription.revoke_reason}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(subscription.starts_at)} to {formatDate(subscription.ends_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatNumber(subscription.interview_quota)}
                    {subscription.daily_interview_limit !== null
                      ? ` (${formatNumber(subscription.daily_interview_limit)}/day)`
                      : ""}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {subscription.source === "payment" ? "Payment" : "Administrator"}
                  </TableCell>
                  <TableCell className="text-right">
                    {state === "revoked" ? (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(subscription)}>
                          Edit
                        </Button>
                        {subscription.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusChange({ subscription, status: "cancelled" })}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusChange({ subscription, status: "active" })}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {editing ? <EditDialog subscription={editing} onOpenChange={(open) => !open && setEditing(null)} /> : null}
      <ActionDialog
        open={Boolean(statusChange)}
        onOpenChange={(open) => !open && setStatusChange(null)}
        title={statusChange?.status === "cancelled" ? "Cancel this subscription?" : "Reactivate this subscription?"}
        description={
          statusChange?.status === "cancelled"
            ? "Platform AI access from this subscription ends immediately. No refund is issued; refund the payment separately if needed."
            : "Access resumes for the rest of its period."
        }
        confirmLabel={statusChange?.status === "cancelled" ? "Cancel subscription" : "Reactivate"}
        destructive={statusChange?.status === "cancelled"}
        reasonRequired={statusChange?.status === "cancelled"}
        onConfirm={(reason) => change.mutateAsync({ ...statusChange, reason })}
      />
    </>
  );
}

function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState(ALL);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const query = useAdminQuery("/admin/subscriptions/", {
    search: deferredSearch,
    state: state === ALL ? null : state,
    page,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Grant a subscription from a user&apos;s account page. Purchases create subscriptions
        automatically after verified payment.
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="grid gap-2">
          <Label htmlFor="sub-search">User email</Label>
          <Input
            id="sub-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub-state">State</Label>
          <Select
            value={state}
            onValueChange={(value) => {
              setState(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="sub-state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            <SubscriptionsTable rows={data.results} showUser />
            <Pagination
              page={page}
              count={data.count}
              pageSize={20}
              onPageChange={setPage}
              isFetching={query.isFetching}
              label="Subscription pages"
            />
          </>
        )}
      </QueryState>
    </div>
  );
}

export default AdminSubscriptionsPage;
