import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Copy, Check, AlertCircle, ExternalLink } from "lucide-react";
import { checkOllamaHealth } from "../lib/ollamaService";
import { useAIStore } from "../stores/aiStore";

interface OllamaSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OllamaSetupWizard({ isOpen, onClose }: OllamaSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [copiedCommand, setCopiedCommand] = useState(false);

  if (!isOpen) return null;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleCheckOllama = async () => {
    setIsChecking(true);
    setCheckError(null);
    setCheckAttempts((prev) => prev + 1);

    try {
      const health = await checkOllamaHealth();

      if (health.available && health.embedding) {
        // Ollama available with embedding model
        useAIStore.setState({
          available: health.available,
          embedding: health.embedding,
          llm: health.llm,
          status: health.available ? "ready" : "unavailable",
        });

        // Auto-advance to next step or close wizard
        if (step === 2) {
          setStep(3);
        } else if (step === 3) {
          // Setup complete
          handleClose();
        }
      } else {
        setCheckError(
          "Ollama not detected yet. Make sure it's installed and running."
        );
      }
    } catch (err) {
      setCheckError("Failed to check Ollama. Please try again.");
      console.error("Health check error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSkip = () => {
    // Mark wizard as skipped for this session
    useAIStore.setState({ skipSetupWizard: true });
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setCheckError(null);
    setCheckAttempts(0);
    onClose();
  };

  const handleNextStep = () => {
    if (step < 3) {
      setCheckError(null);
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setCheckError(null);
      setStep(step - 1);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-text mb-3">
                Your AI stays private
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Ollama runs AI models locally on your computer. All your journal
                entries stay on your device — no cloud, no tracking, no data
                leaving your computer.
              </p>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-text">
                <strong>Why local AI?</strong> We believe your personal thoughts
                are yours alone. That's why Chronicle AI processes everything
                right here on your device.
              </p>
            </div>

            <div>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium text-sm"
              >
                Download Ollama
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-text mb-3">
                Install Ollama
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Follow the installer from ollama.com. Once installed, Ollama
                will start automatically. It runs in the background as a service
                on your computer.
              </p>
            </div>

            <div className="bg-surface-secondary border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary italic">
                Waiting for you to install Ollama and start the service...
              </p>
            </div>

            {checkError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-3">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {checkError}
                </p>
              </div>
            )}

            {checkAttempts >= 3 && !checkError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Still having issues? Make sure Ollama is running and try
                  restarting it or your computer.
                </p>
              </div>
            )}

            <button
              onClick={handleCheckOllama}
              disabled={isChecking}
              className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isChecking ? "Checking..." : "Installed? Check Now"}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-text mb-3">
                Install embedding model
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                To use semantic search, open your terminal and run this command:
              </p>
            </div>

            <div className="bg-surface-secondary rounded-lg p-4 font-mono text-sm border border-border">
              <code className="text-text break-all">
                ollama pull nomic-embed-text
              </code>
            </div>

            <button
              onClick={() => copyToClipboard("ollama pull nomic-embed-text")}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary border border-border rounded-lg hover:border-accent/50 transition-colors text-sm font-medium text-text-secondary hover:text-text"
            >
              {copiedCommand ? (
                <>
                  <Check size={16} className="text-accent" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy command
                </>
              )}
            </button>

            <div className="bg-surface-secondary rounded-lg p-4 border border-border/50">
              <p className="text-xs text-text-muted mb-2 font-semibold">
                For advanced Q&A features:
              </p>
              <p className="text-xs text-text-secondary font-mono">
                ollama pull llama2:7b
              </p>
              <button
                onClick={() => copyToClipboard("ollama pull llama2:7b")}
                className="mt-2 text-xs text-accent hover:underline"
              >
                Copy Q&A command
              </button>
            </div>

            {checkError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-3">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {checkError}
                </p>
              </div>
            )}

            <button
              onClick={handleCheckOllama}
              disabled={isChecking}
              className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isChecking ? "Checking..." : "Models installed? Check Now"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg rounded-xl border border-border shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text">Set Up Local AI</h1>
          <button
            onClick={handleSkip}
            className="text-text-muted hover:text-text transition-colors p-1"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 4l12 12M16 4L4 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s <= step ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Step {step} of 3
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">{renderStep()}</div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-2">
          {step > 1 && (
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-3 py-2 text-text-muted hover:text-text border border-border rounded-lg transition-colors text-sm font-medium"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={handleNextStep}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 rounded-lg transition-colors text-sm font-medium"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}

          <button
            onClick={handleSkip}
            className="px-3 py-2 text-text-muted hover:text-text border border-border rounded-lg transition-colors text-sm font-medium"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
