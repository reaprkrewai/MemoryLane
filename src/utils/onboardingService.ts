/**
 * Onboarding Service
 * Handles persistence of first-run onboarding completion to SQLite settings table.
 *
 * Settings KV row: key='onboarding_completed_at', value=String(unix-ms timestamp).
 * Row presence == "user has been onboarded". Skip and completion both write the
 * same row (no separate "skipped" flag — D-03).
 *
 * All three helpers are non-fatal: errors are logged to the console and the
 * function resolves without throwing. Onboarding is non-critical UX; surfacing
 * a notification dialog on a settings-write failure would be more disruptive
 * than the silent failure (matches aiSettingsService.ts convention).
 */

import { getDb } from "../lib/db";
import { useUiStore } from "../stores/uiStore";

/**
 * Read the onboarding completion flag from SQLite settings.
 * Returns true iff a row exists for key='onboarding_completed_at'.
 * On DB error: logs and returns false (re-shows the overlay — safer than
 * silently hiding it forever after a transient glitch).
 */
export async function loadOnboardingState(): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'onboarding_completed_at'`,
      []
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Failed to load onboarding state:", err);
    return false;
  }
}

/**
 * Mark onboarding as completed (called on Step 3 finish OR Skip-tour click).
 * Writes the settings row AND flips the uiStore primitive so the App.tsx
 * render gate closes the overlay immediately.
 *
 * Schema note: the settings table is (key, value, updated_at) only. We
 * deliberately do NOT mirror aiSettingsService.ts:42's extra column list
 * (latent schema drift in that file).
 */
export async function markOnboardingCompleted(): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES ('onboarding_completed_at', ?, ?)`,
      [String(now), now]
    );
    useUiStore.getState().setIsOnboardingCompleted(true);
  } catch (err) {
    console.error("Failed to mark onboarding completed:", err);
  }
}

/**
 * Reset onboarding so the welcome flow re-mounts from Step 1.
 * Called from Settings -> Help -> "Replay" button.
 * Deletes the settings row AND flips the uiStore primitive to false so the
 * App.tsx render gate re-mounts the overlay (no app restart needed).
 */
export async function replayOnboarding(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `DELETE FROM settings WHERE key = 'onboarding_completed_at'`
    );
    useUiStore.getState().setIsOnboardingCompleted(false);
  } catch (err) {
    console.error("Failed to replay onboarding:", err);
  }
}
