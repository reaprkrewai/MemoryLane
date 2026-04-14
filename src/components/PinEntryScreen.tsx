import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifyPin } from "../lib/pinCrypto";
import { getAppLock } from "../lib/db";

interface PinEntryScreenProps {
  onUnlock: () => void;
}

export function PinEntryScreen({ onUnlock }: PinEntryScreenProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    // Focus input on mount
    const input = document.getElementById("pin-entry");
    if (input) input.focus();
  }, []);

  const handleVerifyPin = async () => {
    if (pin.length < 4) {
      setError("Please enter your PIN");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const lockRecord = await getAppLock();
      if (!lockRecord) {
        throw new Error("PIN not configured");
      }

      const isValid = await verifyPin(pin, lockRecord.pin_hash, lockRecord.pin_salt);

      if (isValid) {
        setPin("");
        setAttemptCount(0);
        toast.success("Unlocked");
        onUnlock();
      } else {
        setAttemptCount((prev) => prev + 1);
        setPin("");
        setError("PIN incorrect, try again");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleVerifyPin();
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 rounded-lg border border-border bg-surface p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-display text-text">Unlock Journal</h1>
          <p className="text-body text-muted">
            Enter your PIN to continue
          </p>
        </div>

        <div className="space-y-4">
          {/* PIN Input */}
          <div className="space-y-2">
            <input
              id="pin-entry"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setPin(value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter PIN"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-center text-body font-mono tracking-widest text-text placeholder-muted focus:border-accent focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {attemptCount > 0 && (
                <p className="mt-1 text-xs">
                  {attemptCount} attempt{attemptCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Unlock Button */}
          <button
            onClick={handleVerifyPin}
            disabled={pin.length < 4 || isLoading}
            className="w-full rounded-md bg-accent px-4 py-2 text-label font-medium text-accent-foreground transition-opacity disabled:opacity-50 hover:enabled:opacity-90"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Verifying...
              </span>
            ) : (
              "Unlock"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-muted">
          {pin.length > 0 && `${pin.length} digits entered`}
        </p>
      </div>
    </div>
  );
}
