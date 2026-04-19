import { useState } from "react";
import { Palette, Shield, Database, ChevronRight, Loader2, Sparkles, Check, Circle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "../stores/uiStore";
import { useViewStore } from "../stores/viewStore";
import { useAIStore } from "../stores/aiStore";
import { useDataExport } from "../hooks/useDataExport";
import { useExportFile } from "../hooks/useExportFile";
import * as hybridAI from "../lib/hybridAIService";
import { saveAIBackendPreference, saveTagSuggestionsEnabled } from "../utils/aiSettingsService";
import { replayOnboarding } from "../utils/onboardingService";
import { createExportZip } from "../utils/zipUtils";
import { SettingRow } from "./SettingRow";
import { TagManagementSection } from "./settings/TagManagementSection";
import { OllamaSetupWizard } from "./OllamaSetupWizard";
import { EmbeddedAISetup } from "./EmbeddedAISetup";
import { PRESETS } from "../lib/paletteData";

// --- Shared option button ---
interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg border font-medium transition-all ${
        selected
          ? "bg-accent text-amber-950 border-accent shadow-sm"
          : "bg-transparent text-text-secondary border-border hover:border-accent/40 hover:text-text hover:bg-surface-secondary"
      }`}
    >
      {label}
    </button>
  );
}

// --- Section header ---
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
        <span className="text-accent">{icon}</span>
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-text">{title}</h2>
    </div>
  );
}

// --- Palette Swatch ---
function PaletteSwatch({
  palette,
  selected,
  theme,
  onClick,
}: {
  palette: (typeof PRESETS)[number];
  selected: boolean;
  theme: "light" | "dark";
  onClick: () => void;
}) {
  const color = theme === "dark" ? palette.dark.accent : palette.light.accent;
  return (
    <button
      onClick={onClick}
      title={palette.label}
      aria-label={`${palette.label} accent color${selected ? " (active)" : ""}`}
      className={`relative h-7 w-7 rounded-full border-2 transition-all flex-shrink-0 ${
        selected
          ? "border-text shadow-sm scale-110"
          : "border-transparent hover:scale-105 hover:border-border"
      }`}
      style={{ backgroundColor: color }}
    >
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5l2.5 2.5 4.5-4.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

// --- Custom Color Swatch ---
function CustomColorSwatch({
  selected,
  currentHex,
  onSelect,
  onChange,
}: {
  selected: boolean;
  currentHex: string;
  onSelect: () => void;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onSelect}
        title="Custom color"
        aria-label={`Custom accent color${selected ? " (active)" : ""}`}
        className={`relative h-7 w-7 rounded-full border-2 overflow-hidden transition-all flex-shrink-0 ${
          selected
            ? "border-text shadow-sm scale-110"
            : "border-dashed border-border hover:scale-105 hover:border-text-secondary"
        }`}
        style={{ backgroundColor: selected ? currentHex : "transparent" }}
      >
        {/* Transparent native color picker layered on top */}
        <input
          type="color"
          value={currentHex}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-hidden="true"
        />
        {!selected && (
          <span className="absolute inset-0 flex items-center justify-center text-text-muted text-xs pointer-events-none">
            +
          </span>
        )}
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5l2.5 2.5 4.5-4.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </button>
      {selected && (
        <span className="text-label font-mono text-muted">{currentHex.toUpperCase()}</span>
      )}
    </div>
  );
}

// --- Appearance Section ---
function AppearanceSection() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const paletteId = useUiStore((s) => s.paletteId);
  const customAccentHex = useUiStore((s) => s.customAccentHex);
  const setPalette = useUiStore((s) => s.setPalette);

  return (
    <section>
      <SectionHeader icon={<Palette size={16} />} title="Appearance" />
      <div className="border-t border-border">
        <SettingRow label="Theme" description="Choose your preferred color scheme">
          <div className="flex gap-1.5">
            <OptionButton
              label="Light"
              selected={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <OptionButton
              label="Dark"
              selected={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
          </div>
        </SettingRow>
        <div className="border-t border-border/50" />
        <SettingRow label="Accent Color" description="Highlight color used throughout the app">
          <div className="flex items-center gap-1.5">
            {PRESETS.map((preset) => (
              <PaletteSwatch
                key={preset.id}
                palette={preset}
                selected={paletteId === preset.id}
                theme={theme}
                onClick={() => setPalette(preset.id)}
              />
            ))}
            <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />
            <CustomColorSwatch
              selected={paletteId === "custom"}
              currentHex={customAccentHex}
              onSelect={() => setPalette("custom", customAccentHex)}
              onChange={(hex) => setPalette("custom", hex)}
            />
          </div>
        </SettingRow>
        <div className="border-t border-border/50" />
        <SettingRow label="Font Size" description="Adjust text size across the app">
          <div className="flex gap-1.5">
            <OptionButton
              label="Small"
              selected={fontSize === "small"}
              onClick={() => setFontSize("small")}
            />
            <OptionButton
              label="Medium"
              selected={fontSize === "medium"}
              onClick={() => setFontSize("medium")}
            />
            <OptionButton
              label="Large"
              selected={fontSize === "large"}
              onClick={() => setFontSize("large")}
            />
          </div>
        </SettingRow>
      </div>
    </section>
  );
}

// --- Security Section ---
function SecuritySection() {
  const idleTimeout = useUiStore((s) => s.idleTimeout);
  const setIdleTimeout = useUiStore((s) => s.setIdleTimeout);

  const timeoutOptions: Array<{ label: string; value: 1 | 5 | 15 | 30 | "never" }> = [
    { label: "1 min", value: 1 },
    { label: "5 min", value: 5 },
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "Never", value: "never" },
  ];

  return (
    <section>
      <SectionHeader icon={<Shield size={16} />} title="Security" />
      <div className="border-t border-border">
        <SettingRow
          label="Auto-lock after"
          description="Lock the app after this period of inactivity"
        >
          <div className="flex gap-1.5 flex-wrap justify-end">
            {timeoutOptions.map((opt) => (
              <OptionButton
                key={String(opt.value)}
                label={opt.label}
                selected={idleTimeout === opt.value}
                onClick={() => setIdleTimeout(opt.value)}
              />
            ))}
          </div>
        </SettingRow>
        <div className="border-t border-border/50" />
        <SettingRow
          label="Change PIN"
          description="Update your journal unlock PIN"
        >
          <button
            onClick={() => toast.info("PIN management coming in a future update")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium"
          >
            Change PIN
            <ChevronRight size={14} />
          </button>
        </SettingRow>
      </div>
    </section>
  );
}

// --- AI Features Section ---
function AIFeaturesSection() {
  const aiBackend = useAIStore((s) => s.aiBackend);
  const setAiBackend = useAIStore((s) => s.setAIBackend);
  const tagSuggestionsEnabled = useAIStore((s) => s.tagSuggestionsEnabled);
  const setTagSuggestionsEnabled = useAIStore((s) => s.setTagSuggestionsEnabled);
  const available = useAIStore((s) => s.available);
  const embedding = useAIStore((s) => s.embedding);
  const llm = useAIStore((s) => s.llm);
  const status = useAIStore((s) => s.status);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckAgain = async () => {
    setIsChecking(true);
    try {
      const health = await hybridAI.checkAIHealth();
      useAIStore.setState({
        available: health.available,
        embedding: health.embedding,
        llm: health.llm,
        status: health.available ? "ready" : "unavailable",
      });
      if (health.available) {
        toast.success("AI features enabled!");
      } else {
        toast.error("AI backend not detected. Please check your setup.");
      }
    } catch (err) {
      toast.error("Failed to check AI status");
      console.error("Health check error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetupGuide = () => {
    useAIStore.setState({ showSetupWizard: true });
  };

  const handleTagSuggestionsToggle = async (value: boolean) => {
    setTagSuggestionsEnabled(value);
    await saveTagSuggestionsEnabled(value);
  };

  const handleBackendChange = async (newBackend: "embedded" | "ollama") => {
    setAiBackend(newBackend);

    // Persist the preference to database
    await saveAIBackendPreference(newBackend);

    toast.info("Backend changed. Re-indexing will happen automatically on next use.");
  };

  return (
    <section>
      <SectionHeader icon={<Sparkles size={16} />} title="AI Features" />
      <div className="border-t border-border">
        {/* Backend selector */}
        <SettingRow
          label="AI Backend"
          description="Choose where AI models run"
        >
          <div className="flex gap-2">
            <OptionButton
              label="Built-in AI"
              selected={aiBackend === "embedded"}
              onClick={() => handleBackendChange("embedded")}
            />
            <OptionButton
              label="External Ollama"
              selected={aiBackend === "ollama"}
              onClick={() => handleBackendChange("ollama")}
            />
          </div>
        </SettingRow>

        <div className="border-t border-border/50" />

        {/* Embedded AI section */}
        {aiBackend === "embedded" && (
          <>
            {/* Download model UI */}
            <EmbeddedAISetup />

            <div className="border-t border-border/50" />

            {/* Status display */}
            <SettingRow
              label="Status"
              description="Embedded AI server status"
            >
              <div className="flex items-center gap-2">
                {status === "checking" ? (
                  <>
                    <Loader2 size={16} className="text-text-muted animate-spin" />
                    <span className="text-sm text-text-muted">Checking...</span>
                  </>
                ) : available ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm text-text">Running</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-text-muted" />
                    <span className="text-sm text-text-muted">Not Running</span>
                  </>
                )}
              </div>
            </SettingRow>

            <div className="border-t border-border/50" />
          </>
        )}

        {/* Ollama section */}
        {aiBackend === "ollama" && (
          <>
            {/* Status display */}
            <SettingRow
              label="Status"
              description="Ollama connection status"
            >
              <div className="flex items-center gap-2">
                {status === "checking" ? (
                  <>
                    <Loader2 size={16} className="text-text-muted animate-spin" />
                    <span className="text-sm text-text-muted">Checking...</span>
                  </>
                ) : available ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm text-text">Available</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-text-muted" />
                    <span className="text-sm text-text-muted">Offline</span>
                  </>
                )}
              </div>
            </SettingRow>

            <div className="border-t border-border/50" />

            {/* Embedding model status */}
            <SettingRow
              label="Embedding model"
              description="nomic-embed-text for semantic search"
            >
              <div className="flex items-center gap-2">
                {embedding ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm text-text">Found</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-text-muted" />
                    <span className="text-sm text-text-muted">Missing</span>
                  </>
                )}
              </div>
            </SettingRow>

            <div className="border-t border-border/50" />

            {/* LLM model status */}
            <SettingRow
              label="LLM model"
              description="llama2:7b for Q&A"
            >
              <div className="flex items-center gap-2">
                {llm ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm text-text">Found</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-text-muted" />
                    <span className="text-sm text-text-muted">Missing</span>
                  </>
                )}
              </div>
            </SettingRow>

            <div className="border-t border-border/50" />
          </>
        )}

        {/* Why local AI explanation */}
        <div className="px-6 py-4 bg-surface-secondary/50 rounded-lg border border-border/50">
          <p className="text-sm text-text-secondary leading-relaxed">
            <strong>Why local AI?</strong> All journal entries stay on your device.
            Nothing is sent to the cloud. Your privacy is protected.
          </p>
        </div>

        <div className="border-t border-border/50 mt-4" />

        {/* Action buttons */}
        <SettingRow label="Actions" description="Check status or configure">
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={handleCheckAgain}
              disabled={isChecking || status === "checking"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50"
            >
              {isChecking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Status"
              )}
            </button>
            {aiBackend === "ollama" && (
              <button
                onClick={handleSetupGuide}
                className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium"
              >
                Setup Guide
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </SettingRow>

        <div className="border-t border-border/50" />
        <SettingRow
          label="Tag suggestions"
          description="Show a sparkle button in the editor to suggest tags via local AI"
        >
          <div className="flex gap-2">
            <OptionButton
              label="On"
              selected={tagSuggestionsEnabled}
              onClick={() => handleTagSuggestionsToggle(true)}
            />
            <OptionButton
              label="Off"
              selected={!tagSuggestionsEnabled}
              onClick={() => handleTagSuggestionsToggle(false)}
            />
          </div>
        </SettingRow>
      </div>
    </section>
  );
}

// --- Data Section ---
function DataSection() {
  const [isExporting, setIsExporting] = useState(false);
  const { collect } = useDataExport();
  const { save } = useExportFile();

  const handleExport = async () => {
    setIsExporting(true);
    const loadingToastId = toast.loading("Preparing export...");

    try {
      // Collect data
      toast.loading("Collecting entries and photos...", { id: loadingToastId });
      const data = await collect();

      // Create ZIP
      toast.loading(`Creating ZIP file (${data.entries.length} entries)...`, {
        id: loadingToastId,
      });
      const { blob, includedPhotos, skippedPhotos } = await createExportZip(data);

      // Save file
      toast.loading("Saving file...", { id: loadingToastId });
      const fileName = await save(blob);

      if (fileName) {
        toast.dismiss(loadingToastId);
        const photoInfo =
          includedPhotos > 0
            ? ` · ${includedPhotos} photos included`
            : skippedPhotos > 0
              ? ` · ${skippedPhotos} photos skipped`
              : "";
        toast.success(`Exported to ${fileName}${photoInfo}`);
      } else {
        toast.dismiss(loadingToastId);
        toast.info("Export cancelled");
      }
    } catch (err) {
      toast.dismiss(loadingToastId);
      const message = err instanceof Error ? err.message : "Export failed";
      console.error("Export error:", err);
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section>
      <SectionHeader icon={<Database size={16} />} title="Data" />
      <div className="border-t border-border">
        <SettingRow
          label="Export Journal"
          description="Download all your entries as a backup"
        >
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                Export Data
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </SettingRow>
      </div>
    </section>
  );
}

// --- Help Section (D-17 + ONBRD-04 — Replay onboarding tour) ---

function HelpSection() {
  const [isReplaying, setIsReplaying] = useState(false);

  const handleReplay = async () => {
    setIsReplaying(true);
    try {
      // WR-01 fix: land on Overview before flipping the gate so QuickWriteFAB
      // is mounted in the DOM by the time Step 2's OnboardingSpotlight queries
      // [data-onboarding="quick-write-fab"]. AppShell only renders the FAB
      // when activeView is overview/timeline/calendar/search — Settings hides
      // it, which would leave Step 2 with a fully-dimmed backdrop and no
      // cutout. setView is synchronous so the view switch is committed before
      // replayOnboarding's awaited DB write resolves.
      useViewStore.getState().setView("overview");

      // replayOnboarding (Plan 01) deletes the settings row AND flips
      // useUiStore.isOnboardingCompleted to false. The OnboardingOverlay
      // mounted by App.tsx (Plan 02) reacts to that primitive and re-mounts
      // at Step 1 — no app restart needed (D-16). On error, this helper logs
      // via console.error and returns silently (no toast — UI-SPEC L176).
      await replayOnboarding();
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <section>
      <SectionHeader icon={<HelpCircle size={16} />} title="Help" />
      <div className="border-t border-border">
        <SettingRow
          label="Replay onboarding tour"
          description="Restart the welcome flow from the beginning"
        >
          <button
            onClick={() => void handleReplay()}
            disabled={isReplaying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50"
          >
            {isReplaying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Resetting...
              </>
            ) : (
              "Replay"
            )}
          </button>
        </SettingRow>
      </div>
    </section>
  );
}

// --- Main Settings View ---
export function SettingsView() {
  const showSetupWizard = useAIStore((s) => s.showSetupWizard);
  const setShowSetupWizard = useAIStore((s) => s.setShowSetupWizard);

  return (
    <div className="flex flex-col h-full overflow-auto bg-bg">
      {/* Page header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-secondary mt-2">
          Customize your Chronicle experience
        </p>
      </div>

      {/* Settings content */}
      <div className="flex-1 px-8 py-8 max-w-3xl w-full mx-auto">
        <div className="flex flex-col gap-10">
          <AppearanceSection />
          <SecuritySection />
          <AIFeaturesSection />
          <DataSection />
          <TagManagementSection />
          <HelpSection />
        </div>

        {/* Version footer */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Chronicle AI</span>
            <span>v1.0.0 · 2026-04-13</span>
          </div>
        </div>
      </div>

      {/* Setup Wizard Modal */}
      <OllamaSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
      />
    </div>
  );
}
