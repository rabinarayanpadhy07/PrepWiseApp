import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog, QueryState, ServerErrors, fieldError } from "@/features/admin/admin-components";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

const NUMBER_FIELDS = [
  ["duration_days", "Duration (days)", "1 to 366"],
  ["ai_token_quota", "AI tokens per period", ""],
  ["daily_ai_token_limit", "AI tokens per day", "Empty for no daily limit"],
  ["interview_quota", "Interviews per period", ""],
  ["daily_interview_limit", "Interviews per day", "Empty for no daily limit"],
  ["voice_seconds_quota", "Voice seconds per period", ""],
  ["daily_voice_seconds_limit", "Voice seconds per day", "Empty for no daily limit"],
];

function toForm(plan) {
  return {
    name: plan.name,
    description: plan.description,
    price: (plan.price_minor / 100).toFixed(2),
    is_active: plan.is_active,
    ...Object.fromEntries(NUMBER_FIELDS.map(([field]) => [field, plan[field] ?? ""])),
  };
}

/** Only changed fields, in API units (paise, integers, null for "no limit"). */
function changesFrom(plan, values) {
  const initial = toForm(plan);
  const changes = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === initial[field]) continue;
    if (field === "price") changes.price_minor = Math.round(Number.parseFloat(value) * 100);
    else if (NUMBER_FIELDS.some(([name]) => name === field)) changes[field] = value === "" ? null : Number(value);
    else changes[field] = value;
  }
  return changes;
}

function PlanCard({ plan }) {
  const [values, setValues] = useState(() => toForm(plan));
  const [confirming, setConfirming] = useState(false);
  const save = useAdminMutation((reason) =>
    adminApi.patch(`/admin/plans/${plan.code}/`, { ...changesFrom(plan, values), reason }),
  );
  const changes = changesFrom(plan, values);
  const dirty = Object.keys(changes).length > 0;
  const set = (field) => (event) =>
    setValues({ ...values, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle as="h2">{plan.name}</CardTitle>
          <Badge variant={plan.is_active ? "success" : "neutral"}>{plan.is_active ? "On sale" : "Hidden"}</Badge>
          <Badge variant="outline">Manual renewal</Badge>
        </div>
        <CardDescription>
          {formatMoney(plan.price_minor, plan.currency)} for {plan.duration_days} days. Changes apply to
          future purchases only; existing subscriptions keep the version they bought.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (dirty) setConfirming(true);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor={`${plan.code}-name`}>Name</Label>
            <Input id={`${plan.code}-name`} maxLength={100} value={values.name} onChange={set("name")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${plan.code}-price`}>Price ({plan.currency})</Label>
            <Input
              id={`${plan.code}-price`}
              type="number"
              min="0.01"
              step="0.01"
              value={values.price}
              onChange={set("price")}
              aria-invalid={fieldError(save.error, "price_minor") ? true : undefined}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor={`${plan.code}-description`}>Description</Label>
            <Textarea id={`${plan.code}-description`} rows={2} value={values.description} onChange={set("description")} />
          </div>
          {NUMBER_FIELDS.map(([field, label, hint]) => (
            <div key={field} className="grid gap-1.5">
              <Label htmlFor={`${plan.code}-${field}`}>{label}</Label>
              <Input
                id={`${plan.code}-${field}`}
                type="number"
                min={field === "duration_days" ? 1 : 0}
                placeholder={hint}
                value={values[field]}
                onChange={set(field)}
                aria-invalid={fieldError(save.error, field) ? true : undefined}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" className="size-4 accent-primary" checked={values.is_active} onChange={set("is_active")} />
            Available for purchase
          </label>
          <div className="md:col-span-2">
            <ServerErrors error={save.error} />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={!dirty}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setValues(toForm(plan))}>
              Discard
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Versions</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <caption className="sr-only">Plan versions</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead className="hidden sm:table-cell">Interviews</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.versions.map((version) => (
                  <TableRow key={version.version}>
                    <TableCell>v{version.version}</TableCell>
                    <TableCell>{formatMoney(version.price_minor, version.currency)}</TableCell>
                    <TableCell>{version.duration_days}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatNumber(version.interview_quota)}</TableCell>
                    <TableCell>{formatDate(version.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <ActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Update ${plan.name}?`}
        description={
          changes.price_minor !== undefined || changes.duration_days !== undefined
            ? `Future purchases will cost ${formatMoney(changes.price_minor ?? plan.price_minor, plan.currency)} for ${changes.duration_days ?? plan.duration_days} days. Existing purchases keep their terms.`
            : "Future purchases use the new terms. Existing purchases keep theirs."
        }
        confirmLabel="Save plan"
        reasonRequired
        onConfirm={(reason) => save.mutateAsync(reason)}
      />
    </Card>
  );
}

function AdminPlansPage() {
  const query = useAdminQuery("/admin/plans/");
  return (
    <QueryState query={query}>
      {(plans) => (
        <div className="space-y-6">
          {plans.map((plan) => (
            // Re-mount after a save so the form shows the stored values.
            <PlanCard key={`${plan.code}-${plan.updated_at}`} plan={plan} />
          ))}
        </div>
      )}
    </QueryState>
  );
}

export default AdminPlansPage;
