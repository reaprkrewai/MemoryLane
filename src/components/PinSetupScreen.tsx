import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateSalt, hashPin } from "../lib/pinCrypto";
import { setAppLock } from "../lib/db";

interface PinSetupScreenProps {
  onComplete: () => Promise<void>;
}

export function PinSetupScreen({ onComplete }: PinSetupScreenProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetPin = async () => {
    setError("");

    // Validation
    if (pin.length < 4 || pin.length > 6) {
      setError("PIN must be 4-6 digits");
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError("PIN must contain only numbers");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Hash the PIN
      const salt = await generateSalt();
      const hash = await hashPin(pin, salt);

      // Store in database
      await setAppLock(hash, salt);

      // Success
      toast.success("PIN set successfully");
      await onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set PIN";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin);
  const pinsMatch = pin === confirmPin && pin.length > 0;

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 rounded-lg border border-border bg-surface p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-display text-text">Set a PIN</h1>
          <p className="text-body text-muted">
            Protect your journal with a 4-6 digit PIN
          </p>
        </div>

        <div className="space-y-4">
          {/* PIN Input */}
          <div className="space-y-2">
            <label htmlFor="pin" className="text-label text-text">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setPin(value);
              }}
              placeholder="Enter 4-6 digits"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-center text-body font-mono tracking-widest text-text placeholder-muted focus:border-accent focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Confirm PIN */}
          <div className="space-y-2">
            <label htmlFor="confirmPin" className="text-label text-text">
              Confirm PIN
            </label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setConfirmPin(value);
              }}
              placeholder="Re-enter PIN"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-center text-body font-mono tracking-widest text-text placeholder-muted focus:border-accent focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Validation Feedback */}
          <div className="space-y-1 text-sm">
            <p className={isValid ? "text-success" : "text-muted"}>
              ✓ 4-6 numeric digits
            </p>
            <p className={pinsMatch ? "text-success" : "text-muted"}>
              ✓ PINs match
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSetPin}
            disabled={!isValid || !pinsMatch || isLoading}
            className="w-full rounded-md bg-accent px-4 py-2 text-label font-medium text-accent-foreground transition-opacity disabled:opacity-50 hover:enabled:opacity-90"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Setting PIN...
              </span>
            ) : (
              "Set PIN"
            )}
          </button>
        </div>

        <p className="text-center text-sm text-muted">
          You will need this PIN to unlock your journal each time you open it.
        </p>
      </div>
    </div>
  );
}
