import { useDeferredValue, useState } from "react";
import { Link } from "react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryState, Stat, formatCost } from "@/features/admin/admin-components";
import { Pagination } from "@/features/dashboard/pagination";
import { useAdminQuery } from "@/lib/api/admin";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { providerLabel } from "@/lib/usage";

const WINDOWS = [7, 30, 90, 365];
const SERIES = [
  { key: "platform_tokens", label: "Platform-paid", color: "var(--chart-1)" },
  { key: "byok_tokens", label: "Own API key", color: "var(--chart-2)" },
];
const AXIS_TEXT = { fill: "var(--muted-foreground)", fontSize: 12 };
const FEATURES = {
  resume_analysis: "Resume analysis",
  interview_questions: "Interview questions",
  answer_evaluation: "Answer feedback",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatDate(label)}</p>
      {payload.map((point) => (
        <p key={point.dataKey} className="text-muted-foreground">
          <span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: point.color }} />
          {point.name}: {formatNumber(point.value)} tokens
        </p>
      ))}
    </div>
  );
}

function DailyChart({ daily }) {
  if (!daily.length) return <EmptyState title="No AI usage in this window" />;
  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`Tokens per day. Platform-paid total ${formatNumber(daily.reduce((sum, day) => sum + day.platform_tokens, 0))}, own-key total ${formatNumber(daily.reduce((sum, day) => sum + day.byok_tokens, 0))}.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickFormatter={formatDate} tick={AXIS_TEXT} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={(value) => formatNumber(value)} tick={AXIS_TEXT} axisLine={false} tickLine={false} width={72} />
            <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={2}
                dot={daily.length <= 31 ? { r: 4, fill: series.color, stroke: "var(--surface)", strokeWidth: 2 } : false}
                activeDot={{ r: 6, fill: series.color, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-primary">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <Table>
            <caption className="sr-only">Tokens per day</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Platform-paid</TableHead>
                <TableHead>Own API key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.map((day) => (
                <TableRow key={day.day}>
                  <TableCell>{formatDate(day.day)}</TableCell>
                  <TableCell>{formatNumber(day.platform_tokens)}</TableCell>
                  <TableCell>{formatNumber(day.byok_tokens)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}

function BreakdownTable({ caption, rows, firstColumn, renderFirst, currency }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No usage.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{firstColumn}</TableHead>
            <TableHead>Paid by</TableHead>
            <TableHead>Calls</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Estimated cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="max-w-56 truncate">{renderFirst(row)}</TableCell>
              <TableCell>{row.source === "byok" ? "User (own key)" : "Platform"}</TableCell>
              <TableCell>{formatNumber(row.calls)}</TableCell>
              <TableCell>{formatNumber(row.tokens)}</TableCell>
              <TableCell>{formatCost(row.estimated_cost, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PerUserTable({ days }) {
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("platform_cost");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(search.trim());
  const query = useAdminQuery("/admin/usage/users/", { days, search: deferred, ordering, page });
  const currency = useAdminQuery("/admin/ai/settings/").data?.cost_currency;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h2">Usage by user</CardTitle>
        <CardDescription>Users with any metered usage in the window.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="grid gap-2">
            <Label htmlFor="usage-search">User email</Label>
            <Input id="usage-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usage-ordering">Sort by</Label>
            <Select value={ordering} onValueChange={(value) => { setOrdering(value); setPage(1); }}>
              <SelectTrigger id="usage-ordering">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_cost">Platform estimated cost</SelectItem>
                <SelectItem value="platform_tokens">Platform tokens</SelectItem>
                <SelectItem value="byok_tokens">Own-key tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <QueryState query={query} isEmpty={(data) => data.count === 0} empty={<EmptyState title="No usage in this window" />}>
          {(data) => (
            <>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <caption className="sr-only">Usage by user</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Platform tokens</TableHead>
                      <TableHead>Platform est. cost</TableHead>
                      <TableHead className="hidden md:table-cell">Own-key tokens</TableHead>
                      <TableHead className="hidden md:table-cell">Interviews</TableHead>
                      <TableHead className="hidden lg:table-cell">Voice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.results.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-56 truncate">
                          <Link to={`/app/admin/users/${row.id}`} className="hover:text-primary">{row.email}</Link>
                        </TableCell>
                        <TableCell>{formatNumber(row.platform_tokens)}</TableCell>
                        <TableCell>{formatCost(row.platform_estimated_cost, currency)}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatNumber(row.byok_tokens)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatNumber(row.platform_interviews)} platform · {formatNumber(row.byok_interviews)} own key
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDuration(row.voice_seconds)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} count={data.count} pageSize={20} onPageChange={setPage} isFetching={query.isFetching} label="Usage pages" />
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

function AdminUsagePage() {
  const [days, setDays] = useState("30");
  const summary = useAdminQuery("/admin/usage/summary/", { days });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Token counts are what providers reported. Costs are estimates from configured model
          prices, not provider invoices. Own-key usage is paid by users and is never platform cost.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="usage-window">Window</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="usage-window" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  Last {value} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <QueryState query={summary}>
        {(data) => (
          <>
            <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Platform-paid tokens" value={formatNumber(data.platform.tokens)} detail={`${formatNumber(data.platform.calls)} calls`} />
              <Stat
                label="Platform estimated cost"
                value={formatCost(data.platform.estimated_cost ?? 0, data.cost_currency)}
                detail={`This month: ${formatCost(data.budget.estimated_spend_this_month, data.cost_currency)} of ${data.budget.monthly_spend_cap === null ? "no cap" : formatCost(data.budget.monthly_spend_cap, data.cost_currency)}`}
              />
              <Stat label="Own-key tokens" value={formatNumber(data.byok.tokens)} detail={`${formatNumber(data.byok.calls)} calls, paid by users`} />
              <Stat
                label="Interviews and voice"
                value={`${formatNumber(data.platform.interviews + data.byok.interviews)} interviews`}
                detail={`${formatDuration(data.platform.voice_seconds + data.byok.voice_seconds)} of voice answers`}
              />
            </section>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle as="h2">Tokens per day</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyChart daily={data.daily} />
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
              <section aria-labelledby="by-model" className="space-y-2">
                <h2 id="by-model" className="text-base font-semibold">By model</h2>
                <BreakdownTable
                  caption="Usage by model"
                  rows={data.by_model}
                  firstColumn="Model"
                  currency={data.cost_currency}
                  renderFirst={(row) => `${providerLabel(row.provider)} · ${row.model}`}
                />
              </section>
              <section aria-labelledby="by-feature" className="space-y-2">
                <h2 id="by-feature" className="text-base font-semibold">By feature</h2>
                <BreakdownTable
                  caption="Usage by feature"
                  rows={data.by_feature}
                  firstColumn="Feature"
                  currency={data.cost_currency}
                  renderFirst={(row) => FEATURES[row.feature] ?? row.feature}
                />
              </section>
            </div>
          </>
        )}
      </QueryState>
      <PerUserTable days={days} />
    </div>
  );
}

export default AdminUsagePage;
