import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionDialog, QueryState, Stat, fieldError } from "@/features/admin/admin-components";
import { ByokUsageSummary, PlatformUsageMeters } from "@/features/ai/usage-meters";
import { useAuth } from "@/features/auth/auth-provider";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { providerLabel } from "@/lib/usage";
import { SubscriptionsTable } from "@/pages/app/admin/subscriptions-page";
import { describeAction } from "@/pages/app/admin/users-page";

function GrantDialog({ user, open, onOpenChange }) {
  const plans = useAdminQuery("/admin/plans/", null, { enabled: open });
  const [planCode, setPlanCode] = useState("");
  const [days, setDays] = useState("");
  const [error, setError] = useState(null);
  const grant = useAdminMutation((reason) =>
    adminApi.post("/admin/subscriptions/", {
      user_id: user.id,
      plan_code: planCode || plans.data?.[0]?.code,
      duration_days: days ? Number(days) : undefined,
      reason,
    }),
  );
  const selected = plans.data?.find((plan) => plan.code === (planCode || plans.data?.[0]?.code));

  return (
    <ActionDialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
      title={`Grant platform AI to ${user.email}`}
      description="Starts now, without a payment. Allowances are copied from the plan's current version."
      confirmLabel="Grant subscription"
      reasonRequired
      onConfirm={(reason) =>
        grant.mutateAsync(reason).catch((caught) => {
          setError(caught);
          throw caught;
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="grant-plan">Plan</Label>
          <Select value={planCode || plans.data?.[0]?.code || ""} onValueChange={setPlanCode}>
            <SelectTrigger id="grant-plan">
              <SelectValue placeholder="Loading plans" />
            </SelectTrigger>
            <SelectContent>
              {(plans.data ?? []).map((plan) => (
                <SelectItem key={plan.code} value={plan.code}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="grant-days">Days</Label>
          <Input
            id="grant-days"
            type="number"
            min={1}
            max={366}
            placeholder={selected ? String(selected.duration_days) : ""}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            aria-invalid={fieldError(error, "duration_days") ? true : undefined}
          />
        </div>
      </div>
    </ActionDialog>
  );
}

function AdminUserDetailPage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const account = useAdminQuery(`/admin/users/${userId}/`);
  const summary = useAdminQuery(`/admin/users/${userId}/summary/`);
  const [action, setAction] = useState(null);
  const [granting, setGranting] = useState(false);
  const copy = describeAction(action);
  const mutation = useAdminMutation((reason) => copy.request(reason));

  return (
    <div className="space-y-6">
      <Button asChild variant="link" className="px-0">
        <Link to="/app/admin/users">
          <ArrowLeft aria-hidden="true" />
          All users
        </Link>
      </Button>

      <QueryState query={account} lines={2}>
        {(user) => (
          <Card className="gap-4">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle as="h2" className="break-all">
                  {user.email}
                </CardTitle>
                <Badge variant={user.is_active ? "success" : "destructive"}>
                  {user.is_active ? "Active" : "Suspended"}
                </Badge>
                {user.role === "admin" ? <Badge>Admin</Badge> : null}
              </div>
              <CardDescription>
                {user.full_name || "No name"} · joined {formatDate(user.date_joined)}
                {user.sessions_revoked_at ? ` · signed out by an administrator ${formatDate(user.sessions_revoked_at)}` : ""}
              </CardDescription>
            </CardHeader>
            {user.id !== me.id ? (
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setGranting(true)} disabled={!user.is_active}>
                  Grant subscription
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAction({ kind: "revoke", user })}>
                  Sign out everywhere
                </Button>
                {user.is_active ? (
                  <Button variant="destructive" size="sm" onClick={() => setAction({ kind: "suspend", user })}>
                    Suspend
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAction({ kind: "reactivate", user })}>
                    Reactivate
                  </Button>
                )}
                <GrantDialog user={user} open={granting} onOpenChange={setGranting} />
              </CardContent>
            ) : null}
          </Card>
        )}
      </QueryState>

      <QueryState query={summary}>
        {(data) => (
          <>
            <section aria-label="Account activity" className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="Resumes" value={formatNumber(data.counts.resumes)} />
              <Stat label="Analyses" value={formatNumber(data.counts.analyses)} />
              <Stat label="Interviews" value={formatNumber(data.counts.interviews)} />
              <Stat label="Answers" value={formatNumber(data.counts.answers)} />
              <Stat label="Feedback" value={formatNumber(data.counts.evaluations)} />
              <Stat label="Orders" value={formatNumber(data.counts.orders)} />
            </section>
            <p className="text-sm text-muted-foreground">
              Interview answers, questions and resume text aren&apos;t shown in administration.
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle as="h2">Platform allowance</CardTitle>
                  <CardDescription>
                    {data.current_usage
                      ? `${data.current_usage.plan_name} until ${formatDate(data.current_usage.ends_at)}`
                      : "No active subscription."}
                  </CardDescription>
                </CardHeader>
                {data.current_usage ? (
                  <CardContent>
                    <PlatformUsageMeters usage={data.current_usage.usage} idPrefix="admin-user-usage" />
                  </CardContent>
                ) : null}
              </Card>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle as="h2">Own API keys</CardTitle>
                  <CardDescription>Only the last four characters are ever shown.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.credentials.length ? (
                    <ul className="space-y-1 text-sm">
                      {data.credentials.map((credential) => (
                        <li key={credential.provider} className="flex flex-wrap items-center gap-2">
                          {providerLabel(credential.provider)}
                          <span className="font-mono text-muted-foreground">{credential.masked_key}</span>
                          {credential.status === "invalid" ? <Badge variant="destructive">Rejected</Badge> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No keys saved.</p>
                  )}
                  <ByokUsageSummary byokUsage={data.byok_usage} />
                </CardContent>
              </Card>
            </div>

            <section aria-labelledby="user-subscriptions" className="space-y-3">
              <h2 id="user-subscriptions" className="text-base font-semibold">
                Subscriptions
              </h2>
              <SubscriptionsTable rows={data.subscriptions} />
            </section>
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

export default AdminUserDetailPage;
