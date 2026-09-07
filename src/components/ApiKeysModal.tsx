import React, { useState } from "react";
import { X, Eye, EyeOff, Sparkles, Check, Key } from "lucide-react";
import { PROVIDERS, ProviderKeys, detectProviderFromKey } from "../types";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ProviderKeys;
  onSaveKeys: (newKeys: ProviderKeys) => void;
  activeProviderId: string;
  onSelectActiveProvider: (id: string) => void;
  hasServerGeminiKey: boolean;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
  activeProviderId,
  onSelectActiveProvider,
  hasServerGeminiKey,
}) => {
  const [localKeys, setLocalKeys] = useState<ProviderKeys>(apiKeys);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [smartKeyInput, setSmartKeyInput] = useState<string>("");
  const [autoDetectedMessage, setAutoDetectedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // When a key is typed/pasted for a provider, automatically select that provider & model!
  const handleKeyChange = (providerId: string, val: string) => {
    setLocalKeys((prev) => ({
      ...prev,
      [providerId]: val,
    }));

    if (val.trim()) {
      onSelectActiveProvider(providerId);
      const prov = PROVIDERS.find((p) => p.id === providerId);
      setAutoDetectedMessage(
        `✓ Key provided for ${prov?.name || providerId}. Model (${prov?.model}) automatically selected!`
      );
    }
  };

  // Smart quick-input to paste any key and auto-assign
  const handleSmartKeyPaste = (rawVal: string) => {
    setSmartKeyInput(rawVal);
    const trimmed = rawVal.trim();
    if (!trimmed) return;

    const detected = detectProviderFromKey(trimmed);
    if (detected) {
      setLocalKeys((prev) => ({
        ...prev,
        [detected]: trimmed,
      }));
      onSelectActiveProvider(detected);
      const prov = PROVIDERS.find((p) => p.id === detected);
      setAutoDetectedMessage(
        `✓ Auto-detected ${prov?.name} API key! Vision model (${prov?.model}) automatically selected.`
      );
      setSmartKeyInput("");
    } else {
      // Default to currently active or gemini
      const targetId = activeProviderId || "gemini";
      setLocalKeys((prev) => ({
        ...prev,
        [targetId]: trimmed,
      }));
      onSelectActiveProvider(targetId);
      const prov = PROVIDERS.find((p) => p.id === targetId);
      setAutoDetectedMessage(
        `Key assigned to ${prov?.name || "Active Provider"}. Model (${prov?.model}) automatically selected.`
      );
      setSmartKeyInput("");
    }
  };

  const handleToggleShow = (providerId: string) => {
    setShowKeyMap((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const handleSaveAndClose = () => {
    onSaveKeys(localKeys);
    onClose();
  };

  const activeProvider = PROVIDERS.find((p) => p.id === activeProviderId) || PROVIDERS[0];

  return (
    <div
      id="api-keys-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        id="api-keys-modal-container"
        className="w-full max-w-[620px] rounded-[16px] overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          background: "#142017",
          border: "1px solid #324E3A",
          boxShadow: "0 0 0 1px rgba(143,191,90,0.1), 0 20px 60px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "#2B4432", background: "#0E1510" }}
        >
          <div>
            <div className="mono text-[13px] tracking-[0.14em] text-[#E6EFE8] font-semibold flex items-center gap-2">
              <Key size={15} className="text-[#8FBF5A]" />
              <span>API KEYS & PROVIDERS</span>
            </div>
            <div className="mono text-[10px] mt-1 text-[#8CA99A]">
              Key dile automatic model select hoye jabe • Alada kore model select korte hobe na
            </div>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full bg-[#1F3324] border border-[#2B4432] flex items-center justify-center text-[#8CA99A] hover:text-[#E6EFE8] hover:border-[#8FBF5A]/50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto scroll-hide flex-1">
          {/* Quick Auto-Detect & Auto-Model Box */}
          <div className="p-3.5 rounded-[12px] bg-[#1A2A1E] border border-[#8FBF5A]/40 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[11px] font-semibold text-[#8FBF5A] flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>SMART AUTO-KEY & MODEL SELECTION</span>
              </span>
              <span className="mono text-[9px] px-2 py-0.5 rounded bg-[#8FBF5A]/20 text-[#8FBF5A] border border-[#8FBF5A]/30">
                AUTO
              </span>
            </div>
            <p className="mono text-[10px] text-[#A8C5B5] mb-2 leading-relaxed">
              যেকোনো Provider-এর API key এখানে পেস্ট করুন। সাথে সাথে Provider চিনে নিয়ে সেরা Vision Model স্বয়ংক্রিয়ভাবে সিলেক্ট হয়ে যাবে:
            </p>
            <div className="flex gap-2">
              <input
                id="smart-key-input"
                type="text"
                value={smartKeyInput}
                onChange={(e) => handleSmartKeyPaste(e.target.value)}
                placeholder="Paste any API key here (Gemini, Groq, OpenRouter, Together, etc.)..."
                className="flex-1 h-[36px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A] placeholder:text-[#6B8A7A]"
              />
            </div>
          </div>

          {/* Success Banner */}
          {autoDetectedMessage && (
            <div className="p-3 rounded-[10px] bg-[#1E3325] border border-[#8FBF5A] flex items-center gap-2 mono text-[11px] text-[#8FBF5A] animate-fadeIn">
              <Check size={14} className="shrink-0" />
              <span>{autoDetectedMessage}</span>
            </div>
          )}

          {/* Currently Active Model Indicator */}
          <div className="px-3 py-2 rounded-[8px] bg-[#0E1510] border border-[#2B4432] flex items-center justify-between">
            <span className="mono text-[10px] text-[#6B8A7A]">AUTOMATICALLY SELECTED MODEL:</span>
            <span className="mono text-[11px] font-semibold text-[#8FBF5A] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8FBF5A] shadow-[0_0_8px_#8FBF5A]" />
              <span>{activeProvider.name} — {activeProvider.model}</span>
            </span>
          </div>

          <div className="mono text-[11px] font-semibold tracking-wider text-[#E6EFE8] mt-2">
            ALL SUPPORTED API PROVIDERS ({PROVIDERS.length}):
          </div>

          {/* All Provider Rows Inside the Modal */}
          <div className="space-y-2.5">
            {PROVIDERS.map((prov) => {
              const isSelected = activeProviderId === prov.id;
              const hasKey = Boolean(localKeys[prov.id]?.trim());
              const hasEnvGemini = prov.id === "gemini" && hasServerGeminiKey;
              const isConfigured = hasKey || hasEnvGemini;
              const isVisible = Boolean(showKeyMap[prov.id]);

              return (
                <div
                  key={prov.id}
                  id={`provider-row-${prov.id}`}
                  className={`rounded-[12px] p-3.5 border transition-all ${
                    isSelected
                      ? "bg-[#1F3324] border-[#8FBF5A]/60 shadow-[0_0_12px_rgba(143,191,90,0.15)]"
                      : "bg-[#0E1510] border-[#2B4432] hover:border-[#324E3A]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className={`w-[8px] h-[8px] rounded-full transition-colors ${
                          isConfigured
                            ? "bg-[#8FBF5A] shadow-[0_0_8px_rgba(143,191,90,0.6)]"
                            : "bg-[#2B4432]"
                        }`}
                      />
                      <span className="mono text-[12px] font-semibold text-[#E6EFE8]">
                        {prov.name}
                      </span>
                      <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#142017] border border-[#2B4432] text-[#8CA99A]">
                        Model: {prov.model}
                      </span>
                      {hasEnvGemini && !hasKey && (
                        <span className="mono text-[8px] px-1.5 py-0.5 rounded bg-[#8FBF5A]/20 text-[#8FBF5A] border border-[#8FBF5A]/30">
                          ENV KEY READY
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="mono text-[9px] px-2 py-0.5 rounded-full bg-[#8FBF5A] text-[#0E1510] font-semibold flex items-center gap-1">
                        <Check size={10} />
                        <span>AUTO-SELECTED</span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        id={`key-input-${prov.id}`}
                        value={localKeys[prov.id] || ""}
                        onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                        placeholder={
                          hasEnvGemini
                            ? "Server key detected (or paste custom key to auto-select)"
                            : `Paste ${prov.name} API key (auto-selects model)`
                        }
                        type={isVisible ? "text" : "password"}
                        className="w-full h-[36px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] pl-3 pr-8 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/70 placeholder:text-[#6B8A7A]"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleShow(prov.id)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B8A7A] hover:text-[#8CA99A] cursor-pointer"
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mono text-[9px] text-[#6B8A7A] mt-2">
                    <span>{prov.description}</span>
                    <span>{prov.endpoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 border-t flex gap-2"
          style={{ borderColor: "#2B4432", background: "#0E1510" }}
        >
          <button
            id="modal-save-close-btn"
            onClick={handleSaveAndClose}
            className="btn-primary-3d flex-1 h-[42px] rounded-[10px] mono text-[11px] tracking-widest font-semibold text-[#0E1510] cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={14} />
            <span>SAVE & APPLY AUTO-SELECTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
