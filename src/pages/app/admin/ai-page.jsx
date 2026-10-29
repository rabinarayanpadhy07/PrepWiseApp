import { Plus } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionDialog, QueryState, ServerErrors, formatCost } from "@/features/admin/admin-components";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatNumber } from "@/lib/format";
import { providerLabel } from "@/lib/usage";

const NONE = "none";
const PROVIDERS = ["anthropic", "openai", "gemini"];

function Field({ id, label, hint, children }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

const EMPTY_MODEL = {
  provider: "anthropic",
  model_id: "",
  display_name: "",
  is_enabled: true,
  allow_platform: false,
  allow_byok: true,
  max_input_tokens: "",
  max_output_tokens: "",
  input_price_per_million: "",
  output_price_per_million: "",
  reasoning_effort: "",
  fallback_id: null,
};

function modelPayload(values, original) {
  const numeric = ["max_input_tokens", "max_output_tokens"];
  const prices = ["input_price_per_million", "output_price_per_million"];
  const payload = {};
  for (const [field, value] of Object.entries(values)) {
    if (original && value === original[field]) continue;
    if (numeric.includes(field)) payload[field] = value === "" ? null : Number(value);
    else if (prices.includes(field)) payload[field] = value === "" ? null : String(value);
    else payload[field] = value;
  }
  if (original) delete payload.provider;
  return payload;
}

function ModelDialog({ model, models, onClose }) {
  const original = model ? { ...EMPTY_MODEL, ...model } : null;
  const [values, setValues] = useState(original ?? EMPTY_MODEL);
  const save = useAdminMutation((reason) =>
    model
      ? adminApi.patch(`/admin/ai/models/${model.id}/`, { ...modelPayload(values, original), reason })
      : adminApi.post("/admin/ai/models/", { ...modelPayload(values, null), reason }),
  );
  const set = (field) => (value) => setValues({ ...values, [field]: value });
  const input = (field) => (event) => set(field)(event.target.value);
  const fallbacks = models.filter((item) => item.provider === values.provider && item.id !== model?.id);

  return (
    <ActionDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={model ? `Edit ${model.display_name}` : "Add an AI model"}
      description="Enter the model identifier and prices exactly as the provider documents them."
      confirmLabel={model ? "Save model" : "Add model"}
      onConfirm={(reason) => save.mutateAsync(reason)}
    >
      <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        <Field id="model-provider" label="Provider">
          <Select value={values.provider} onValueChange={set("provider")} disabled={Boolean(model)}>
            <SelectTrigger id="model-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {providerLabel(provider)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="model-id" label="Model identifier">
          <Input id="model-id" value={values.model_id} onChange={input("model_id")} spellCheck={false} />
        </Field>
        <Field id="model-name" label="Display name">
          <Input id="model-name" value={values.display_name} onChange={input("display_name")} />
        </Field>
        <Field id="model-effort" label="Reasoning effort" hint="Provider-specific; empty for the default.">
          <Input id="model-effort" value={values.reasoning_effort} onChange={input("reasoning_effort")} />
        </Field>
        <Field id="model-max-in" label="Max input tokens per request">
          <Input id="model-max-in" type="number" min={1} value={values.max_input_tokens} onChange={input("max_input_tokens")} />
        </Field>
        <Field id="model-max-out" label="Max output tokens per request">
          <Input id="model-max-out" type="number" min={1} value={values.max_output_tokens} onChange={input("max_output_tokens")} />
        </Field>
        <Field id="model-price-in" label="Input price per 1M tokens" hint="Platform cost currency. Required for platform use.">
          <Input id="model-price-in" type="number" min={0} step="0.000001" value={values.input_price_per_million ?? ""} onChange={input("input_price_per_million")} />
        </Field>
        <Field id="model-price-out" label="Output price per 1M tokens">
          <Input id="model-price-out" type="number" min={0} step="0.000001" value={values.output_price_per_million ?? ""} onChange={input("output_price_per_million")} />
        </Field>
        <Field id="model-fallback" label="Cheaper fallback" hint="Same provider, cheaper on both prices.">
          <Select
            value={values.fallback_id ? String(values.fallback_id) : NONE}
            onValueChange={(value) => set("fallback_id")(value === NONE ? null : Number(value))}
          >
            <SelectTrigger id="model-fallback">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No fallback</SelectItem>
              {fallbacks.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid content-end gap-2">
          <Check checked={values.is_enabled} onChange={set("is_enabled")}>Enabled</Check>
          <Check checked={values.allow_platform} onChange={set("allow_platform")}>Platform-paid requests</Check>
          <Check checked={values.allow_byok} onChange={set("allow_byok")}>Users&apos; own keys</Check>
        </div>
      </div>
    </ActionDialog>
  );
}

function ModelsSection({ models, currency }) {
  const [editing, setEditing] = useState(undefined);
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle as="h2">Models</CardTitle>
          <CardDescription>Per-request token limits, prices and fallbacks. Disable models instead of deleting them.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" />
          Add model
        </Button>
      </CardHeader>
      <CardContent>
        {models.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <caption className="sr-only">AI models</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Use</TableHead>
                  <TableHead className="hidden md:table-cell">Limits (in / out)</TableHead>
                  <TableHead className="hidden lg:table-cell">Price per 1M (in / out)</TableHead>
                  <TableHead className="hidden lg:table-cell">Fallback</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="max-w-56">
                      <span className="block truncate font-medium">{model.display_name}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {providerLabel(model.provider)} · {model.model_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!model.is_enabled ? <Badge variant="neutral">Disabled</Badge> : null}
                        {model.allow_platform ? <Badge>Platform</Badge> : null}
                        {model.allow_byok ? <Badge variant="outline">BYOK</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatNumber(model.max_input_tokens)} / {formatNumber(model.max_output_tokens)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {model.input_price_per_million === null
                        ? "Not set"
                        : `${formatCost(model.input_price_per_million, currency)} / ${formatCost(model.output_price_per_million, currency)}`}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {models.find((item) => item.id === model.fallback_id)?.display_name ?? "None"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditing(model)} aria-label={`Edit ${model.display_name}`}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No models configured" description="AI features stay unavailable until a model is added and assigned to an enabled mode." />
        )}
      </CardContent>
      {editing !== undefined ? <ModelDialog model={editing} models={models} onClose={() => setEditing(undefined)} /> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

const MODE_FIELDS = ["description", "is_enabled", "platform_provider", "anthropic_model_id", "openai_model_id", "gemini_model_id", "allow_fallback"];

function ModeCard({ mode, models }) {
  const [values, setValues] = useState(() => Object.fromEntries(MODE_FIELDS.map((field) => [field, mode[field]])));
  const [confirming, setConfirming] = useState(false);
  const changes = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== mode[field]));
  const save = useAdminMutation((reason) => adminApi.patch(`/admin/ai/modes/${mode.key}/`, { ...changes, reason }));
  const set = (field) => (value) => setValues({ ...values, [field]: value });

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle as="h3">{mode.label}</CardTitle>
          <Badge variant={mode.is_enabled ? "success" : "neutral"}>{mode.is_enabled ? "Enabled" : "Disabled"}</Badge>
          {mode.key === "fast" ? <Badge variant="outline">Default</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (Object.keys(changes).length) setConfirming(true);
          }}
        >
          <Field id={`${mode.key}-description`} label="Description">
            <Input id={`${mode.key}-description`} maxLength={200} value={values.description} onChange={(event) => set("description")(event.target.value)} />
          </Field>
          {PROVIDERS.map((provider) => (
            <Field key={provider} id={`${mode.key}-${provider}`} label={`${providerLabel(provider)} model`}>
              <Select
                value={values[`${provider}_model_id`] ? String(values[`${provider}_model_id`]) : NONE}
                onValueChange={(value) => set(`${provider}_model_id`)(value === NONE ? null : Number(value))}
              >
                <SelectTrigger id={`${mode.key}-${provider}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {models
                    .filter((model) => model.provider === provider)
                    .map((model) => (
                      <SelectItem key={model.id} value={String(model.id)}>
                        {model.display_name}
                        {model.is_enabled ? "" : " (disabled)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
          <Field id={`${mode.key}-platform`} label="Serves platform-paid requests">
            <Select value={values.platform_provider || NONE} onValueChange={(value) => set("platform_provider")(value === NONE ? "" : value)}>
              <SelectTrigger id={`${mode.key}-platform`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No platform AI in this mode</SelectItem>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {providerLabel(provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Check checked={values.allow_fallback} onChange={set("allow_fallback")}>
            Allow fallback to each model&apos;s cheaper fallback
          </Check>
          <Check checked={values.is_enabled} onChange={set("is_enabled")}>
            Enabled
          </Check>
          <ServerErrors error={save.error} />
          <div>
            <Button type="submit" size="sm" disabled={!Object.keys(changes).length}>
              Save {mode.label}
            </Button>
          </div>
        </form>
      </CardContent>
      <ActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Update the ${mode.label} mode?`}
        description="New AI requests in this mode use the new configuration immediately."
        confirmLabel="Save mode"
        onConfirm={(reason) => save.mutateAsync(reason)}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Platform settings
// ---------------------------------------------------------------------------

const SETTING_FIELDS = [
  ["cost_currency", "Cost currency", "Currency of model prices and the cap (ISO code).", "text"],
  ["monthly_spend_cap", "Monthly platform spending cap", "Empty refuses all platform AI. An estimate-based safeguard, not a billing guarantee.", "number"],
  ["voice_max_answer_seconds", "Max seconds per voice answer", "10 to 3,600.", "number"],
  ["byok_daily_voice_seconds", "Voice seconds per day (own key)", "Fair-use limit for users on their own key.", "number"],
  ["byok_daily_interviews", "Interviews per day (own key)", "Empty for no limit.", "number"],
  ["reservation_ttl_seconds", "Reservation hold (seconds)", "Must exceed the AI request timeout.", "number"],
];

function SettingsSection({ settings }) {
  const initial = Object.fromEntries(SETTING_FIELDS.map(([field]) => [field, settings[field] ?? ""]));
  const [values, setValues] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const changes = Object.fromEntries(
    Object.entries(values)
      .filter(([field, value]) => String(value) !== String(initial[field]))
      .map(([field, value]) => [
        field,
        value === "" ? null : field === "cost_currency" || field === "monthly_spend_cap" ? String(value) : Number(value),
      ]),
  );
  const save = useAdminMutation((reason) => adminApi.patch("/admin/ai/settings/", { ...changes, reason }));

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h2">Platform limits</CardTitle>
        <CardDescription>Global spending cap, voice limits and fair-use limits for users&apos; own keys.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (Object.keys(changes).length) setConfirming(true);
          }}
        >
          {SETTING_FIELDS.map(([field, label, hint, type]) => (
            <Field key={field} id={`setting-${field}`} label={label} hint={hint}>
              <Input
                id={`setting-${field}`}
                type={type}
                min={type === "number" ? 0 : undefined}
                step={field === "monthly_spend_cap" ? "0.01" : undefined}
                value={values[field]}
                onChange={(event) => setValues({ ...values, [field]: event.target.value })}
              />
            </Field>
          ))}
          <div className="md:col-span-2">
            <ServerErrors error={save.error} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!Object.keys(changes).length}>
              Save limits
            </Button>
          </div>
        </form>
      </CardContent>
      <ActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Update platform limits?"
        description="New limits apply to requests from now on."
        confirmLabel="Save limits"
        reasonRequired
        onConfirm={(reason) => save.mutateAsync(reason)}
      />
    </Card>
  );
}

function AdminAIPage() {
  const providers = useAdminQuery("/admin/ai/providers/");
  const models = useAdminQuery("/admin/ai/models/");
  const modes = useAdminQuery("/admin/ai/modes/");
  const settings = useAdminQuery("/admin/ai/settings/");

  return (
    <div className="space-y-6">
      <QueryState query={providers} lines={2}>
        {(rows) => (
          <section aria-label="Providers" className="grid gap-4 sm:grid-cols-3">
            {rows.map((row) => (
              <Card key={row.provider} className="gap-2 py-4">
                <CardContent className="space-y-1 px-4">
                  <p className="font-medium">{row.label}</p>
                  <Badge variant={row.platform_key_configured ? "success" : "neutral"}>
                    {row.platform_key_configured ? "Platform key configured" : "No platform key"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {row.models} model(s). Keys are set in the server environment, never here.
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </QueryState>
      <QueryState query={models}>
        {(rows) => <ModelsSection models={rows} currency={settings.data?.cost_currency} />}
      </QueryState>
      <section aria-labelledby="modes-heading" className="space-y-3">
        <h2 id="modes-heading" className="text-base font-semibold">
          AI modes
        </h2>
        <QueryState query={modes}>
          {(rows) => (
            <div className="grid gap-4 xl:grid-cols-3">
              {rows.map((mode) => (
                <ModeCard key={`${mode.key}-${JSON.stringify(mode)}`} mode={mode} models={models.data ?? []} />
              ))}
            </div>
          )}
        </QueryState>
      </section>
      <QueryState query={settings}>
        {(data) => <SettingsSection key={data.updated_at} settings={data} />}
      </QueryState>
    </div>
  );
}

export default AdminAIPage;
