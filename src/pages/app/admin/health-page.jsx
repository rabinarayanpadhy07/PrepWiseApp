import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryState, ServerErrors } from "@/features/admin/admin-components";
import { Pagination } from "@/features/dashboard/pagination";
import { adminApi, useAdminQuery } from "@/lib/api/admin";
import { formatDateTime, formatNumber } from "@/lib/format";

const ALL = "all";

function ProviderCard({ row }) {
  const queryClient = useQueryClient();
  const check = useMutation({
    mutationFn: () => adminApi.post(`/admin/health/providers/${row.provider}/check/`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
  const stats = row.last_24h;
  const rate = stats.error_rate === null ? null : Math.round(stats.error_rate * 100);

  return (
    <Card className="gap-3">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle as="h2">{row.label}</CardTitle>
          <Badge variant={row.platform_key_configured ? "success" : "neutral"}>
            {row.platform_key_configured ? "Platform key set" : "No platform key"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-muted-foreground">Calls (24h)</dt>
            <dd className="font-medium">{formatNumber(stats.total)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Errors (24h)</dt>
            <dd className="font-medium">
              {formatNumber(stats.errors)}
              {rate !== null ? ` (${rate}%)` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Average latency</dt>
            <dd className="font-medium">
              {stats.average_latency_ms === null ? "No successful calls" : `${formatNumber(Math.round(stats.average_latency_ms))} ms`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last success</dt>
            <dd className="font-medium">{row.last_success_at ? formatDateTime(row.last_success_at) : "Never"}</dd>
          </div>
        </dl>
        {row.last_error ? (
          <p className="text-muted-foreground">
            Last error: <span className="font-mono">{row.last_error.outcome}</span> at {formatDateTime(row.last_error.at)}
          </p>
        ) : null}
        {check.data ? (
          <p role="status" className={check.data.ok ? "text-success-text" : "text-destructive-text"}>
            {check.data.ok
              ? `The provider accepted the platform key (${check.data.latency_ms} ms).`
              : `Check failed: ${check.data.outcome}.`}
          </p>
        ) : null}
        <ServerErrors error={check.error} title="The check couldn't run" />
        <Button variant="outline" size="sm" onClick={() => check.mutate()} isLoading={check.isPending} disabled={!row.platform_key_configured}>
          Test platform key
        </Button>
      </CardContent>
    </Card>
  );
}

function CallLog() {
  const [provider, setProvider] = useState(ALL);
  const [errorsOnly, setErrorsOnly] = useState(true);
  const [page, setPage] = useState(1);
  const query = useAdminQuery("/admin/health/calls/", {
    provider: provider === ALL ? null : provider,
    errors_only: errorsOnly ? "true" : null,
    page,
  });

  return (
    <section aria-labelledby="call-log" className="space-y-3">
      <h2 id="call-log" className="text-base font-semibold">Call log</h2>
      <p className="text-sm text-muted-foreground">
        Sanitized: outcome codes and timings only. Prompts, responses and user identities aren&apos;t recorded.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="call-provider">Provider</Label>
          <Select value={provider} onValueChange={(value) => { setProvider(value); setPage(1); }}>
            <SelectTrigger id="call-provider" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All providers</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={errorsOnly} onChange={(event) => { setErrorsOnly(event.target.checked); setPage(1); }} />
          Errors only
        </label>
      </div>
      <QueryState query={query} isEmpty={(data) => data.count === 0} empty={<EmptyState title={errorsOnly ? "No errors recorded" : "No calls recorded"} />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <caption className="sr-only">Provider calls</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Provider and model</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="hidden md:table-cell">Feature</TableHead>
                    <TableHead className="hidden md:table-cell">Paid by</TableHead>
                    <TableHead className="hidden sm:table-cell">Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(call.created_at)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {call.provider}
                        <span className="block truncate font-mono text-xs text-muted-foreground">{call.model || "key check"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={call.outcome === "success" ? "success" : "destructive"}>{call.outcome}</Badge>
                        {call.used_fallback ? <span className="block text-xs text-muted-foreground">fallback</span> : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{call.feature}</TableCell>
                      <TableCell className="hidden md:table-cell">{call.billing_mode === "byok" ? "Own key" : "Platform"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatNumber(call.latency_ms)} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} count={data.count} pageSize={20} onPageChange={setPage} isFetching={query.isFetching} label="Call log pages" />
          </>
        )}
      </QueryState>
    </section>
  );
}

function AdminHealthPage() {
  const health = useAdminQuery("/admin/health/providers/");
  return (
    <div className="space-y-6">
      <QueryState query={health}>
        {(rows) => (
          <div className="grid gap-4 lg:grid-cols-3">
            {rows.map((row) => (
              <ProviderCard key={row.provider} row={row} />
            ))}
          </div>
        )}
      </QueryState>
      <CallLog />
    </div>
  );
}

export default AdminHealthPage;
