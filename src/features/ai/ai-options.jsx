import { CreditCard, KeyRound } from "lucide-react";
import { useId, useState } from "react";

import { FieldError } from "@/components/feedback/error-message";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { providerLabel } from "@/lib/usage";
import { cn } from "@/lib/utils";

/** Which billing modes this user can use right now. */
export function billingAvailability(access) {
  return {
    platform: access?.platform_status === "available",
    byok: Boolean(access?.byok_available),
  };
}

function modesFor(access, billingMode) {
  return (access?.modes ?? []).filter((mode) => {
    if (billingMode === "platform") return mode.platform;
    if (billingMode === "byok") return mode.byok_with_saved_key.length > 0;
    return true;
  });
}

function initialBilling(access) {
  const available = billingAvailability(access);
  const saved = access?.preference?.billing_mode;
  if (saved && available[saved]) return saved;
  if (available.platform && !available.byok) return "platform";
  if (available.byok && !available.platform) return "byok";
  return ""; // both or neither: the user must choose explicitly
}

/**
 * The user's explicit AI choice for one request. Never picks a billing mode
 * the user can't see: with both available and no saved preference, the user
 * must choose.
 */
export function useAiOptions(access) {
  const [billingMode, setBillingModeState] = useState(null);
  const [aiMode, setAiMode] = useState(null);
  const [byokProvider, setByokProvider] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const available = billingAvailability(access);
  const billing = billingMode ?? initialBilling(access);
  const modes = modesFor(access, billing);
  const preferredMode = aiMode ?? access?.preference?.ai_mode ?? access?.default_mode;
  const mode = modes.find((item) => item.key === preferredMode) ?? modes[0] ?? null;
  const providers = billing === "byok" && mode ? mode.byok_with_saved_key : [];
  const preferredProvider = byokProvider ?? access?.preference?.byok_provider;
  const provider = providers.includes(preferredProvider) ? preferredProvider : providers[0] ?? null;

  const hasAccess = available.platform || available.byok;
  let error = null;
  if (hasAccess && !billing) error = "Choose how this request is paid for.";
  else if (hasAccess && !mode) error = "No AI mode is available for this choice.";

  return {
    access,
    available,
    hasAccess,
    billingMode: billing,
    setBillingMode: (value) => {
      setBillingModeState(value);
      setShowErrors(false);
    },
    aiMode: mode?.key ?? null,
    setAiMode,
    modes,
    byokProvider: provider,
    setByokProvider,
    providers,
    error: showErrors ? error : null,
    /** Returns the request options, or null (and shows errors) if a choice is missing. */
    validate() {
      if (!hasAccess || error) {
        setShowErrors(true);
        return null;
      }
      return {
        billingMode: billing,
        aiMode: mode.key,
        byokProvider: billing === "byok" ? provider : null,
      };
    },
  };
}

function BillingOption({ value, current, onChange, icon: Icon, title, description }) {
  const id = useId();
  const checked = current === value;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:bg-muted",
      )}
    >
      <input
        id={id}
        type="radio"
        name="billing-mode"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 size-4 accent-primary"
      />
      <span className="space-y-0.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4" aria-hidden="true" />
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

/** Form fields for an AI request: billing mode, the user's key provider, and AI mode. */
function AiOptionsFields({ options }) {
  const errorId = useId();
  const { available, billingMode, modes, aiMode, providers, byokProvider } = options;
  const both = available.platform && available.byok;
  const selectedMode = modes.find((mode) => mode.key === aiMode);

  if (!options.hasAccess) return null;

  return (
    <div className="grid gap-4">
      {both ? (
        <fieldset className="grid gap-2" aria-describedby={options.error ? errorId : undefined}>
          <legend className="mb-1 text-sm font-medium">Pay for this request with</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <BillingOption
              value="platform"
              current={billingMode}
              onChange={options.setBillingMode}
              icon={CreditCard}
              title="Platform AI"
              description="Uses your subscription allowance."
            />
            <BillingOption
              value="byok"
              current={billingMode}
              onChange={options.setBillingMode}
              icon={KeyRound}
              title="Your own API key"
              description="Your provider bills this usage."
            />
          </div>
        </fieldset>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {billingMode === "byok" ? (
            <>
              <KeyRound className="size-4" aria-hidden="true" />
              Uses your own API key. Your provider bills this usage.
            </>
          ) : (
            <>
              <CreditCard className="size-4" aria-hidden="true" />
              Uses your platform AI subscription allowance.
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {modes.length ? (
          <div className="grid gap-2">
            <Label htmlFor="ai-mode">AI mode</Label>
            <Select value={aiMode ?? undefined} onValueChange={options.setAiMode}>
              <SelectTrigger id="ai-mode" aria-describedby="ai-mode-description">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modes.map((mode) => (
                  <SelectItem key={mode.key} value={mode.key}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="ai-mode-description" className="text-sm text-muted-foreground">
              {selectedMode?.description || "Fast is the default."}
            </p>
          </div>
        ) : null}
        {billingMode === "byok" && providers.length > 1 ? (
          <div className="grid gap-2">
            <Label htmlFor="byok-provider">Your key</Label>
            <Select value={byokProvider ?? undefined} onValueChange={options.setByokProvider}>
              <SelectTrigger id="byok-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {providerLabel(provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <FieldError id={errorId}>{options.error}</FieldError>
    </div>
  );
}

export { AiOptionsFields };
