import { useDeferredValue, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QueryState } from "@/features/admin/admin-components";
import { Pagination } from "@/features/dashboard/pagination";
import { useAdminQuery } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";

const ALL = "all";
const ACTIONS = [
  ["user.", "Users"],
  ["subscription.", "Subscriptions"],
  ["plan.", "Plans"],
  ["ai_model.", "AI models"],
  ["ai_mode.", "AI modes"],
  ["ai_settings.", "Platform limits"],
  ["payment.", "Refunds"],
  ["provider.", "Provider checks"],
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function AdminAuditPage() {
  const [action, setAction] = useState(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(search.trim());
  const query = useAdminQuery("/admin/audit-log/", {
    action: action === ALL ? null : action,
    search: deferred,
    page,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="grid gap-2">
          <Label htmlFor="audit-search">Administrator email</Label>
          <Input id="audit-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="audit-action">Area</Label>
          <Select value={action} onValueChange={(value) => { setAction(value); setPage(1); }}>
            <SelectTrigger id="audit-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All changes</SelectItem>
              {ACTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <QueryState query={query} isEmpty={(data) => data.count === 0} empty={<EmptyState title="No audit entries" />}>
        {(data) => (
          <>
            <ol className="space-y-3">
              {data.results.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="font-medium">
                      <span className="font-mono text-sm">{entry.action}</span> · {entry.target_label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)} by {entry.actor_email}
                    </p>
                  </div>
                  {Object.keys(entry.changes).length ? (
                    <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                      {Object.entries(entry.changes).map(([field, [before, after]]) => (
                        <li key={field} className="break-words">
                          <span className="font-medium text-foreground">{field.replaceAll("_", " ")}</span>:{" "}
                          {formatValue(before)} → {formatValue(after)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {entry.reason ? <p className="mt-2 text-sm">Reason: {entry.reason}</p> : null}
                </li>
              ))}
            </ol>
            <Pagination page={page} count={data.count} pageSize={20} onPageChange={setPage} isFetching={query.isFetching} label="Audit log pages" />
          </>
        )}
      </QueryState>
    </div>
  );
}

export default AdminAuditPage;
