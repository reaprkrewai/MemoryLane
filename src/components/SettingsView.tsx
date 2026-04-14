import { useState } from "react";
import { Palette, Shield, Database, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "../stores/uiStore";
import { useDataExport } from "../hooks/useDataExport";
import { useExportFile } from "../hooks/useExportFile";
import { createExportZip } from "../utils/zipUtils";
import { SettingRow } from "./SettingRow";

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

// --- Appearance Section ---
function AppearanceSection() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);

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

// --- Main Settings View ---
export function SettingsView() {
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
          <DataSection />
        </div>

        {/* Version footer */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Chronicle AI</span>
            <span>v1.0.0 · 2026-04-13</span>
          </div>
        </div>
      </div>
    </div>
  );
}
