import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ErrorMessage } from "@/components/feedback/error-message";
import { FormError } from "@/components/feedback/form-alerts";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { FormField } from "@/components/forms/form-field";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAccessCard } from "@/features/ai/ai-access-card";
import { useAuth } from "@/features/auth/auth-provider";
import { changePasswordSchema, profileSchema } from "@/features/auth/schemas";
import {
  useAccessStatus,
  useDeleteCredential,
  useSaveCredential,
  useTestCredential,
  useUpdatePreference,
} from "@/lib/api/ai";
import { changePassword, updateProfile } from "@/lib/api/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { applyServerErrors } from "@/lib/form-errors";

function SavedNotice({ children }) {
  return (
    <Alert variant="success" role="status">
      <CheckCircle2 aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [formErrors, setFormErrors] = useState([]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset,
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { fullName: user.full_name } });
  const mutation = useMutation({
    mutationFn: updateProfile,
    onMutate: () => setFormErrors([]),
    onSuccess: (updated) => {
      updateUser(updated);
      reset({ fullName: updated.full_name });
    },
    onError: (error) => setFormErrors(applyServerErrors(error, setError, { full_name: "fullName" })),
  });

  return (
    <Card className="max-w-2xl gap-4">
      <CardHeader>
        <CardTitle as="h2">Profile</CardTitle>
        <CardDescription>
          Member since {formatDate(user.date_joined)}.{" "}
          {user.role === "admin" ? <Badge className="ml-1">Administrator</Badge> : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-5">
          <FormError messages={formErrors} />
          {mutation.isSuccess && !isDirty ? <SavedNotice>Your profile was saved.</SavedNotice> : null}
          <FormField id="profile-name" label="Full name" error={errors.fullName?.message}>
            {(fieldProps) => <Input autoComplete="name" {...fieldProps} {...register("fullName")} />}
          </FormField>
          <FormField
            id="profile-email"
            label="Email"
            description="Your email address is your login and can't be changed here."
          >
            {(fieldProps) => <Input type="email" value={user.email} readOnly disabled {...fieldProps} />}
          </FormField>
          <div>
            <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const PASSWORD_FIELDS = { current_password: "currentPassword", new_password: "newPassword" };

function ChangePasswordForm() {
  const { startSession } = useAuth();
  const [formErrors, setFormErrors] = useState([]);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const mutation = useMutation({
    mutationFn: changePassword,
    onMutate: () => setFormErrors([]),
    onSuccess: (session) => {
      startSession(session);
      reset();
    },
    onError: (error) => setFormErrors(applyServerErrors(error, setError, PASSWORD_FIELDS)),
  });

  return (
    <Card className="max-w-2xl gap-4">
      <CardHeader>
        <CardTitle as="h2">Change password</CardTitle>
        <CardDescription>Changing your password signs you out on your other devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-5">
          <FormError messages={formErrors} />
          {mutation.isSuccess ? <SavedNotice>Your password was changed.</SavedNotice> : null}
          <FormField id="current-password" label="Current password" error={errors.currentPassword?.message}>
            {(fieldProps) => (
              <Input type="password" autoComplete="current-password" {...fieldProps} {...register("currentPassword")} />
            )}
          </FormField>
          <FormField
            id="new-password"
            label="New password"
            description="At least 8 characters, not only numbers, and not a common password."
            error={errors.newPassword?.message}
          >
            {(fieldProps) => (
              <Input type="password" autoComplete="new-password" {...fieldProps} {...register("newPassword")} />
            )}
          </FormField>
          <FormField id="confirm-password" label="Confirm new password" error={errors.confirmPassword?.message}>
            {(fieldProps) => (
              <Input type="password" autoComplete="new-password" {...fieldProps} {...register("confirmPassword")} />
            )}
          </FormField>
          <div>
            <Button type="submit" isLoading={mutation.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const KEY_PLACEHOLDERS = { anthropic: "sk-ant-…", openai: "sk-…", gemini: "AIza…" };

function PasswordTab() {
  const { user } = useAuth();
  // Accounts created with Google sign-in have no password to change.
  if (user?.has_password === false) {
    return (
      <Card className="max-w-2xl gap-4">
        <CardHeader>
          <CardTitle as="h2">Password</CardTitle>
          <CardDescription>
            You sign in with Google, so your account has no PrepWise password. Manage your sign-in
            security in your Google account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return <ChangePasswordForm />;
}

function ApiKeyForm({ provider, label, existing, onDone, onCancel }) {
  const save = useSaveCredential();
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState(null);
  const inputId = `api-key-${provider}`;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setKeyError("Paste your API key.");
      return;
    }
    setKeyError(null);
    save.mutate(
      { provider, apiKey: apiKey.trim() },
      {
        // The key is cleared whatever the outcome; it's never kept in the page.
        onSettled: () => setApiKey(""),
        onSuccess: () => onDone?.(),
      },
    );
  };

  const serverKeyError = save.error?.details?.api_key?.join(" ");

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <FormField
        id={inputId}
        label={`${label} API key`}
        description="We test the key with the provider, then store it encrypted. It's never shown again or sent back to your browser."
        error={keyError || serverKeyError}
      >
        {(fieldProps) => (
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={KEY_PLACEHOLDERS[provider]}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            {...fieldProps}
          />
        )}
      </FormField>
      {save.error && !serverKeyError ? (
        <ErrorMessage title="The key wasn't saved" error={save.error} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={save.isPending}>
          {save.isPending ? "Testing key…" : existing ? "Test and replace key" : "Test and save key"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Keep the current key
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ProviderKeyCard({ provider, label, credential }) {
  const test = useTestCredential();
  const remove = useDeleteCredential();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [replacing, setReplacing] = useState(false);

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle as="h3">{label}</CardTitle>
          {credential ? (
            credential.status === "active" ? (
              <Badge variant="success">
                <KeyRound aria-hidden="true" />
                Working
              </Badge>
            ) : (
              <Badge variant="destructive">Rejected by provider</Badge>
            )
          ) : (
            <Badge variant="neutral">Not added</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {credential && !replacing ? (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Key</dt>
                <dd className="font-mono">{credential.masked_key}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last tested</dt>
                <dd>
                  {credential.last_verified_at ? formatDateTime(credential.last_verified_at) : "Never"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last used</dt>
                <dd>
                  {credential.last_used_at ? formatDateTime(credential.last_used_at) : "Not used yet"}
                </dd>
              </div>
            </dl>
            {test.isSuccess ? <SavedNotice>The provider accepted this key.</SavedNotice> : null}
            {test.error ? <ErrorMessage title="Key test failed" error={test.error} /> : null}
            {remove.error ? <ErrorMessage title="The key wasn't removed" error={remove.error} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" isLoading={test.isPending} onClick={() => test.mutate(provider)}>
                {test.isPending ? "Testing…" : "Test key"}
              </Button>
              <Button variant="outline" onClick={() => setReplacing(true)}>
                Replace key
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
                <Trash2 aria-hidden="true" />
                Remove key
              </Button>
            </div>
          </>
        ) : (
          <ApiKeyForm
            provider={provider}
            label={label}
            existing={credential}
            onDone={() => setReplacing(false)}
            onCancel={credential ? () => setReplacing(false) : undefined}
          />
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove your ${label} key?`}
        description="PrepWise deletes the stored key. Requests set to use your own key stop working until you add one again; they never switch to platform AI on their own."
        confirmLabel="Remove key"
        destructive
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(provider, { onSuccess: () => setConfirmRemove(false) })}
      />
    </Card>
  );
}

const ASK = "ask";

function PreferenceCard({ access }) {
  const update = useUpdatePreference();
  const { preference, modes, credentials } = access;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h2">Defaults</CardTitle>
        <CardDescription>
          Used when a request doesn&apos;t say otherwise. You can still choose for each request.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="default-billing">Pay for AI with</Label>
          <Select
            value={preference.billing_mode || ASK}
            onValueChange={(value) => update.mutate({ billing_mode: value === ASK ? "" : value })}
          >
            <SelectTrigger id="default-billing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ASK}>Ask each time when both are available</SelectItem>
              <SelectItem value="platform">Platform AI (subscription)</SelectItem>
              <SelectItem value="byok" disabled={!credentials.length}>
                My own API key
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="default-mode">AI mode</Label>
          <Select
            value={modes.some((mode) => mode.key === preference.ai_mode) ? preference.ai_mode : undefined}
            onValueChange={(value) => update.mutate({ ai_mode: value })}
            disabled={!modes.length}
          >
            <SelectTrigger id="default-mode">
              <SelectValue placeholder="No AI modes available" />
            </SelectTrigger>
            <SelectContent>
              {modes.map((mode) => (
                <SelectItem key={mode.key} value={mode.key}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {update.error ? (
          <ErrorMessage className="md:col-span-2" title="Your choice wasn't saved" error={update.error} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function AiTab() {
  const access = useAccessStatus();

  if (access.isPending) return <CardSkeleton lines={4} />;
  if (access.error) return <ErrorMessage error={access.error} onRetry={access.refetch} />;

  const credentials = Object.fromEntries(
    access.data.credentials.map((credential) => [credential.provider, credential]),
  );

  return (
    <div className="grid max-w-3xl gap-6">
      <AiAccessCard showManageLink={false} />
      <PreferenceCard access={access.data} />
      <section aria-labelledby="byok-keys-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="byok-keys-heading" className="text-base font-semibold">
            Your own API keys (BYOK)
          </h2>
          <p className="text-sm text-muted-foreground">
            Available on every account, with or without a subscription. Your provider bills usage
            on your key directly. If a request on your key fails, it isn&apos;t retried on platform
            AI.
          </p>
        </div>
        {access.data.providers.map((item) => (
          <ProviderKeyCard
            key={item.provider}
            provider={item.provider}
            label={item.label}
            credential={credentials[item.provider]}
          />
        ))}
      </section>
    </div>
  );
}

const TABS = ["profile", "password", "ai"];

function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "profile";

  return (
    <>
      <DocumentTitle title="Settings" />
      <div className="space-y-6">
        <PageHeader title="Settings" description="Manage your profile, password and AI access." />
        <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="ai">AI access</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="password" className="mt-6">
            <PasswordTab />
          </TabsContent>
          <TabsContent value="ai" className="mt-6">
            <AiTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default SettingsPage;
