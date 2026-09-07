import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, LoaderCircle, Download, FileText, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dropzone } from "./components/Dropzone";
import { ImageCard } from "./components/ImageCard";
import { ApiKeysModal } from "./components/ApiKeysModal";
import { ExportModal } from "./components/ExportModal";
import { ContactModal } from "./components/ContactModal";
import {
  ExecutionMode,
  StockPlatform,
  ImageItem,
  AnalysisResult,
  ProviderKeys,
  PROVIDERS,
} from "./types";

const STORAGE_KEYS_PREFIX = "prompt_executor_keys_v1";

export default function App() {
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [mode, setMode] = useState<ExecutionMode>("metadata");
  const [activeProviderId, setActiveProviderId] = useState<string>("gemini");
  const [apiKeys, setApiKeys] = useState<ProviderKeys>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS_PREFIX);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState<boolean>(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<StockPlatform[]>([
    "AdobeStock",
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [minTitleWords, setMinTitleWords] = useState<number>(4);
  const [maxTitleWords, setMaxTitleWords] = useState<number>(12);
  const [minKeywords, setMinKeywords] = useState<number>(15);
  const [maxKeywords, setMaxKeywords] = useState<number>(49);
  const [singleWordOnly, setSingleWordOnly] = useState<boolean>(true);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [titlePrefix, setTitlePrefix] = useState<string>("");
  const [titleSuffix, setTitleSuffix] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" | "success" } | null>(null);

  const formatTitleWithAffixes = (
    base: string,
    prefix: string,
    suffix: string
  ): string => {
    const p = prefix.trim();
    const s = suffix.trim();
    let cleanBase = base.trim();
    if (p) {
      cleanBase = `${p} ${cleanBase}`;
    }
    if (s) {
      cleanBase = `${cleanBase} ${s}`;
    }
    return cleanBase;
  };

  const handleChangeTitlePrefix = (newPrefix: string) => {
    setTitlePrefix(newPrefix);
    setImages((prev) =>
      prev.map((img) => {
        if (!img.result) return img;
        const base = img.result.baseTitle || img.result.title;
        return {
          ...img,
          result: {
            ...img.result,
            baseTitle: base,
            title: formatTitleWithAffixes(base, newPrefix, titleSuffix),
          },
        };
      })
    );
  };

  const handleChangeTitleSuffix = (newSuffix: string) => {
    setTitleSuffix(newSuffix);
    setImages((prev) =>
      prev.map((img) => {
        if (!img.result) return img;
        const base = img.result.baseTitle || img.result.title;
        return {
          ...img,
          result: {
            ...img.result,
            baseTitle: base,
            title: formatTitleWithAffixes(base, titlePrefix, newSuffix),
          },
        };
      })
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "info" | "error" | "success" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check server configuration
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.hasServerGeminiKey === "boolean") {
          setHasServerGeminiKey(data.hasServerGeminiKey);
        }
      })
      .catch(() => {
        // Dev server or client only fallback
      });
  }, []);

  // Save API keys to localStorage
  const handleSaveKeys = (newKeys: ProviderKeys) => {
    setApiKeys(newKeys);
    try {
      localStorage.setItem(STORAGE_KEYS_PREFIX, JSON.stringify(newKeys));
      // Auto-select provider if currently active provider has no key but another does
      if (!newKeys[activeProviderId]?.trim()) {
        const withKey = PROVIDERS.find((p) => Boolean(newKeys[p.id]?.trim()));
        if (withKey) {
          setActiveProviderId(withKey.id);
        }
      }
      showToast("API keys saved • Model automatically selected", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const activeProvider =
    PROVIDERS.find((p) => p.id === activeProviderId) || PROVIDERS[0];

  // Helper to read file to base64
  const readFileAsBase64 = (
    file: File
  ): Promise<{ b64: string; mime: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(",")[1];
        resolve({ b64, mime: file.type || "image/jpeg", preview: result });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle uploaded files
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const validFiles = Array.from(fileList).filter(
        (f) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|svg)$/i.test(f.name)
      );

      if (validFiles.length === 0) {
        showToast("Please select valid image files (JPG, PNG, WEBP, SVG)", "error");
        return;
      }

      const newItems: ImageItem[] = [];
      for (const file of validFiles) {
        try {
          const { b64, mime, preview } = await readFileAsBase64(file);
          newItems.push({
            id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
            file,
            preview,
            base64: b64,
            mime,
            status: "idle",
          });
        } catch (err) {
          console.error("Error reading file:", file.name, err);
        }
      }

      setImages((prev) => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} image${newItems.length > 1 ? "s" : ""}`, "success");
    },
    []
  );

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFiles]);

  const handleTogglePlatform = (platform: StockPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleUpdateCardResult = (
    id: string,
    updatedTitle: string,
    updatedKeywords: string[]
  ) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id && img.result) {
          return {
            ...img,
            result: {
              ...img.result,
              baseTitle: updatedTitle,
              title: updatedTitle,
              keywords: updatedKeywords,
            },
          };
        }
        return img;
      })
    );
  };

  // Analyze single image item with automatic provider & model routing
  const analyzeImageItem = async (item: ImageItem): Promise<any> => {
    // Resolve effective provider automatically
    let effectiveProvider = activeProviderId;
    const currentHasKey =
      (effectiveProvider === "gemini" && hasServerGeminiKey) ||
      Boolean(apiKeys[effectiveProvider]?.trim());

    if (!currentHasKey) {
      const configuredProv = PROVIDERS.find((p) => Boolean(apiKeys[p.id]?.trim()));
      if (configuredProv) {
        effectiveProvider = configuredProv.id;
        setActiveProviderId(configuredProv.id);
      } else if (hasServerGeminiKey) {
        effectiveProvider = "gemini";
        setActiveProviderId("gemini");
      }
    }

    const userEnteredKey = apiKeys[effectiveProvider]?.trim();

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: effectiveProvider,
        apiKey: userEnteredKey || undefined,
        imageBase64: item.base64,
        mimeType: item.mime,
        fileName: item.file.name,
        mode,
        minTitleWords,
        maxTitleWords,
        minKeywords,
        maxKeywords,
        singleWordOnly,
        customPrompt,
        platforms: selectedPlatforms,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Server responded with status ${response.status}`);
    }

    return data;
  };

  // Process all idle or pending images
  const handleProcessAll = async () => {
    if (!aiEnabled) {
      showToast("AI is currently toggled OFF. Click AI OFF to turn it on.", "error");
      return;
    }

    // Check key availability across any provider or server key
    const hasAnyKey =
      hasServerGeminiKey ||
      Boolean(apiKeys[activeProviderId]?.trim()) ||
      PROVIDERS.some((p) => Boolean(apiKeys[p.id]?.trim()));

    if (!hasAnyKey) {
      showToast(
        "Please enter an API key in the API Keys section to run vision analysis.",
        "error"
      );
      setIsKeysModalOpen(true);
      return;
    }

    if (images.length === 0) {
      showToast("Upload images first to process metadata.", "info");
      return;
    }

    setIsProcessing(true);

    for (const item of images) {
      if (item.status === "done") continue;

      setImages((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "processing", error: undefined } : it
        )
      );

      try {
        const rawResult = await analyzeImageItem(item);
        const baseTitle = rawResult.title || "";
        const result: AnalysisResult = {
          ...rawResult,
          baseTitle,
          title: formatTitleWithAffixes(baseTitle, titlePrefix, titleSuffix),
        };
        setImages((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "done", result } : it
          )
        );
      } catch (err: any) {
        const errorMsg = err.message || "Analysis failed";
        setImages((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: "error", error: errorMsg }
              : it
          )
        );

        if (
          errorMsg.toLowerCase().includes("rate limit") ||
          errorMsg.toLowerCase().includes("quota")
        ) {
          showToast(errorMsg, "error");
          break; // Stop processing further images to avoid cascading rate limit errors
        }
      }

      // Small delay between requests to respect API cadence
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setIsProcessing(false);
    setImages((current) => {
      const doneCount = current.filter((it) => it.status === "done").length;
      const errorCount = current.filter((it) => it.status === "error").length;
      if (errorCount > 0) {
        showToast(
          `Processed ${doneCount} asset${doneCount !== 1 ? "s" : ""}. ${errorCount} had errors.`,
          "info"
        );
      } else if (doneCount > 0) {
        showToast(`All ${doneCount} assets processed successfully!`, "success");
      }
      return current;
    });
  };

  const handleRetrySingle = async (item: ImageItem) => {
    if (!aiEnabled) {
      showToast("AI is currently toggled OFF", "error");
      return;
    }

    setImages((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: "processing", error: undefined } : it
      )
    );

    try {
      const rawResult = await analyzeImageItem(item);
      const baseTitle = rawResult.title || "";
      const result: AnalysisResult = {
        ...rawResult,
        baseTitle,
        title: formatTitleWithAffixes(baseTitle, titlePrefix, titleSuffix),
      };
      setImages((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "done", result } : it
        )
      );
      showToast("Image re-analyzed successfully", "success");
    } catch (err: any) {
      setImages((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "error", error: err.message || "Analysis failed" }
            : it
        )
      );
    }
  };

  const handleRetryFailed = async () => {
    if (!aiEnabled) {
      showToast("AI is currently toggled OFF", "error");
      return;
    }
    const failedItems = images.filter((img) => img.status === "error");
    if (failedItems.length === 0) return;

    setIsProcessing(true);
    for (const item of failedItems) {
      setImages((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "processing", error: undefined } : it
        )
      );

      try {
        const rawResult = await analyzeImageItem(item);
        const baseTitle = rawResult.title || "";
        const result: AnalysisResult = {
          ...rawResult,
          baseTitle,
          title: formatTitleWithAffixes(baseTitle, titlePrefix, titleSuffix),
        };
        setImages((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "done", result } : it))
        );
      } catch (err: any) {
        setImages((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "error", error: err.message || "Analysis failed" } : it
          )
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setIsProcessing(false);
  };

  const handleDownloadPromptsTxt = () => {
    const completedItems = images.filter(
      (img) => img.status === "done" && img.result?.prompt?.trim()
    );

    if (completedItems.length === 0) {
      showToast("No generated prompts to download yet. Process images first.", "info");
      return;
    }

    // Only prompts written in the text file
    const txtContent = completedItems
      .map((item) => item.result!.prompt.trim())
      .filter(Boolean)
      .join("\n\n");

    const blob = new Blob([txtContent], {
      type: "text/plain;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adobestock-prompts-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${completedItems.length} prompt(s) as TXT`, "success");
  };

  const totalCount = images.length;
  const completedCount = images.filter((img) => img.status === "done").length;
  const errorCount = images.filter((img) => img.status === "error").length;
  const processingCount = images.filter((img) => img.status === "processing").length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      id="prompt-executor-app"
      className="min-h-screen w-full text-[#E6EFE8] selection:bg-[#8FBF5A]/30 flex flex-col"
      style={{
        background: "#0E1510",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[150] px-4 py-2.5 rounded-[10px] mono text-[11px] border backdrop-blur flex items-center gap-2 transition-all shadow-xl ${
            toast.type === "error"
              ? "bg-red-950/90 text-red-200 border-red-800"
              : toast.type === "success"
              ? "bg-[#1F3324]/95 text-[#8FBF5A] border-[#8FBF5A]/40 olive-glow"
              : "bg-[#1A2A1E]/95 text-[#E6EFE8] border-[#2B4432]"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={14} className="text-red-400 shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#8FBF5A] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        aiEnabled={aiEnabled}
        onToggleAi={() => {
          setAiEnabled(!aiEnabled);
          showToast(`AI is now ${!aiEnabled ? "ON" : "OFF"}`);
        }}
        onOpenContact={() => setIsContactModalOpen(true)}
      />

      {/* Main App Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          mode={mode}
          onSelectMode={(m) => setMode(m)}
          selectedPlatforms={selectedPlatforms}
          onTogglePlatform={handleTogglePlatform}
          minTitleWords={minTitleWords}
          maxTitleWords={maxTitleWords}
          onChangeTitleWords={(min, max) => {
            setMinTitleWords(min);
            setMaxTitleWords(max);
          }}
          minKeywords={minKeywords}
          maxKeywords={maxKeywords}
          onChangeKeywords={(min, max) => {
            setMinKeywords(min);
            setMaxKeywords(max);
          }}
          customPrompt={customPrompt}
          onChangeCustomPrompt={setCustomPrompt}
          titlePrefix={titlePrefix}
          onChangeTitlePrefix={handleChangeTitlePrefix}
          titleSuffix={titleSuffix}
          onChangeTitleSuffix={handleChangeTitleSuffix}
          singleWordOnly={singleWordOnly}
          onToggleSingleWord={() => setSingleWordOnly(!singleWordOnly)}
          apiKeys={apiKeys}
          hasServerGeminiKey={hasServerGeminiKey}
          activeProviderId={activeProviderId}
          onOpenKeysModal={() => setIsKeysModalOpen(true)}
        />

        {/* Main Workspace */}
        <main
          id="main-workspace"
          className="flex-1 p-4 md:p-6 min-h-[calc(100vh-62px)] flex flex-col relative"
        >
          {/* Top Edge Progress Line across main workspace */}
          {totalCount > 0 && (
            <div
              id="top-edge-progress-container"
              className="absolute top-0 left-0 right-0 h-[3px] bg-[#1A2A1E] z-20 overflow-hidden"
            >
              <div
                id="top-edge-progress-bar"
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercentage}%`,
                  background: "linear-gradient(90deg, #6FA03E, #8FBF5A, #B4E677)",
                  boxShadow: progressPercentage > 0 ? "0 0 8px rgba(143,191,90,0.6)" : "none",
                }}
              />
            </div>
          )}

          {images.length === 0 ? (
            <Dropzone
              mode={mode}
              onFilesSelected={processFiles}
              onBrowseClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="max-w-[1020px] mx-auto w-full">
              {/* Prominent Visual Progress Bar Card */}
              <div
                id="workspace-progress-card"
                className="mb-5 rounded-[12px] p-4 border transition-all"
                style={{
                  background: "#142017",
                  borderColor: isProcessing
                    ? "rgba(143, 191, 90, 0.45)"
                    : progressPercentage === 100
                    ? "rgba(143, 191, 90, 0.3)"
                    : "#233929",
                  boxShadow: isProcessing
                    ? "0 0 20px rgba(143, 191, 90, 0.12), 0 4px 12px rgba(0, 0, 0, 0.25)"
                    : "0 4px 12px rgba(0, 0, 0, 0.2)",
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isProcessing ? (
                      <span className="flex items-center gap-1.5 mono text-[11px] font-semibold text-[#8FBF5A] tracking-wider">
                        <LoaderCircle size={14} className="animate-spin text-[#8FBF5A]" />
                        <span>PROCESSING ASSETS</span>
                      </span>
                    ) : progressPercentage === 100 ? (
                      <span className="flex items-center gap-1.5 mono text-[11px] font-semibold text-[#8FBF5A] tracking-wider">
                        <CheckCircle2 size={14} className="text-[#8FBF5A]" />
                        <span>PROCESSING COMPLETE</span>
                      </span>
                    ) : (
                      <span className="mono text-[11px] tracking-wider text-[#8CA99A]">
                        BATCH PROGRESS
                      </span>
                    )}

                    <span className="mono text-[11px] text-[#6B8A7A]">
                      ({completedCount} of {totalCount} completed
                      {errorCount > 0 && (
                        <span className="text-red-400 ml-1">
                          • {errorCount} error{errorCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      )
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isProcessing && processingCount > 0 && (
                      <span className="mono text-[10px] px-2 py-0.5 rounded-full bg-[#8FBF5A]/15 text-[#8FBF5A] border border-[#8FBF5A]/30">
                        {processingCount} active
                      </span>
                    )}
                    <span
                      id="progress-percentage-display"
                      className="mono font-bold text-[14px] tracking-wider text-[#8FBF5A]"
                    >
                      {progressPercentage}%
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar Track and Animated Fill */}
                <div
                  className="w-full h-3 rounded-full overflow-hidden relative"
                  style={{
                    background: "#0A100C",
                    border: "1px solid #1E3325",
                  }}
                >
                  <div
                    id="progress-bar-fill"
                    className="h-full rounded-full transition-all duration-500 ease-out relative"
                    style={{
                      width: `${progressPercentage}%`,
                      background:
                        progressPercentage === 100
                          ? "linear-gradient(90deg, #6FA03E 0%, #8FBF5A 50%, #B4E677 100%)"
                          : "linear-gradient(90deg, #53792E 0%, #8FBF5A 100%)",
                      boxShadow:
                        progressPercentage > 0
                          ? "0 0 12px rgba(143, 191, 90, 0.45)"
                          : "none",
                    }}
                  >
                    {isProcessing && progressPercentage > 0 && progressPercentage < 100 && (
                      <div className="absolute inset-0 bg-white/25 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Error Notice & Recovery Banner */}
              {errorCount > 0 && !isProcessing && (
                <div
                  id="batch-error-banner"
                  className="mb-5 rounded-[12px] p-3.5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1C1515] border-red-500/30 text-[#E6EFE8]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] mono leading-relaxed">
                      <span className="text-red-300 font-semibold">
                        {errorCount} asset{errorCount !== 1 ? "s" : ""} encountered an error.
                      </span>{" "}
                      <span className="text-[#A9A0A0]">
                        If due to API rate limits or quota, retry now or add a personal API key in Manage API Keys.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleRetryFailed}
                      className="mono text-[10px] tracking-wider font-semibold px-3 py-1.5 rounded-[8px] bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 transition-colors cursor-pointer"
                    >
                      RETRY FAILED ({errorCount})
                    </button>
                    <button
                      onClick={() => setIsKeysModalOpen(true)}
                      className="mono text-[10px] tracking-wider font-semibold px-3 py-1.5 rounded-[8px] bg-[#1F3324] hover:bg-[#2B4432] text-[#8FBF5A] border border-[#8FBF5A]/40 transition-colors cursor-pointer"
                    >
                      MANAGE KEYS
                    </button>
                  </div>
                </div>
              )}

              {/* Batch Controls Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#1E3325]">
                <div
                  className="mono text-[11px] tracking-[0.14em]"
                  style={{ color: "#8FBF5A" }}
                >
                  {images.length} IMAGES • {activeProvider.name.toUpperCase()} •{" "}
                  {mode.toUpperCase()}
                  {completedCount > 0 && (
                    <span className="text-[#8CA99A] ml-2">
                      ({completedCount}/{images.length} done)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="clear-all-images-btn"
                    onClick={() => setImages([])}
                    disabled={isProcessing}
                    className="btn-secondary-3d mono text-[11px] px-3.5 h-[34px] rounded-[8px] flex items-center gap-1.5 text-[#8CA99A] hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    <span>CLEAR</span>
                  </button>

                  {completedCount > 0 && (
                    <>
                      <button
                        id="open-export-modal-btn"
                        onClick={() => setIsExportModalOpen(true)}
                        className="btn-secondary-3d mono text-[11px] tracking-wider px-3.5 h-[34px] rounded-[8px] flex items-center gap-1.5 text-[#8FBF5A] border-[#8FBF5A]/30 hover:border-[#8FBF5A]/60 transition-colors cursor-pointer"
                        title="Export CSV for Adobe Stock, Shutterstock, Freepik"
                      >
                        <Download size={13} />
                        <span>DOWNLOAD CSV</span>
                      </button>

                      <button
                        id="download-txt-prompts-btn"
                        onClick={handleDownloadPromptsTxt}
                        className="btn-secondary-3d mono text-[11px] tracking-wider px-3.5 h-[34px] rounded-[8px] flex items-center gap-1.5 text-[#8FBF5A] border-[#8FBF5A]/40 bg-[#8FBF5A]/10 hover:bg-[#8FBF5A]/20 hover:border-[#8FBF5A]/70 transition-colors cursor-pointer"
                        title="Download all generated prompts in a .txt file"
                      >
                        <FileText size={13} />
                        <span>DOWNLOAD TXT</span>
                      </button>
                    </>
                  )}

                  <button
                    id="process-metadata-btn"
                    onClick={handleProcessAll}
                    disabled={isProcessing}
                    className="btn-primary-3d mono text-[11px] tracking-widest px-5 h-[36px] rounded-[10px] flex items-center gap-2 text-[#0E1510] font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessing && <LoaderCircle size={14} className="animate-spin" />}
                    <span>
                      {isProcessing
                        ? "PROCESSING..."
                        : mode === "metadata"
                        ? "PROCESS METADATA"
                        : "GENERATE PROMPTS"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid of Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((item) => (
                  <ImageCard
                    key={item.id}
                    item={item}
                    mode={mode}
                    onRemove={handleRemoveImage}
                    onRetry={handleRetrySingle}
                    onUpdateResult={handleUpdateCardResult}
                  />
                ))}

                {/* Add More Tile */}
                <button
                  id="add-more-images-tile"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[14px] border-dashed border-[1.5px] border-[#2B4432] bg-[#1A2A1E]/50 hover:border-[#8FBF5A]/40 hover:bg-[#1F3324]/50 flex flex-col items-center justify-center gap-2 py-12 transition-all group cursor-pointer"
                >
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-[#1F3324] border border-[#2B4432] flex items-center justify-center group-hover:border-[#8FBF5A]/30 transition-colors">
                    <Plus size={16} color="#8FBF5A" />
                  </div>
                  <span className="mono text-[11px] text-[#8CA99A] group-hover:text-[#E6EFE8] transition-colors">
                    Add more images
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.svg"
            multiple
            className="hidden"
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                await processFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />

          {/* Footer branding note */}
          <div
            className="mono text-[9px] tracking-widest text-center py-6 mt-auto opacity-40 select-none"
            style={{ color: "#6B8A7A" }}
          >
            PROMPT EXECUTOR • OLIVE • MICROSTOCK • REAL VISION API
          </div>
        </main>
      </div>

      {/* 7 Providers API Keys Modal */}
      <ApiKeysModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={handleSaveKeys}
        activeProviderId={activeProviderId}
        onSelectActiveProvider={(id) => {
          setActiveProviderId(id);
          showToast(`Active provider set to ${id.toUpperCase()}`);
        }}
        hasServerGeminiKey={hasServerGeminiKey}
      />

      {/* Microstock Export CSV / Data Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={images}
        platforms={selectedPlatforms}
      />

      {/* Creator Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}
