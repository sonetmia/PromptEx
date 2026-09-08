import React, { useEffect, useState } from "react";
import { X, Eye, EyeOff, Sparkles, Check, Key, LoaderCircle, ShieldCheck, CircleAlert } from "lucide-react";
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

type TestState = "idle" | "testing" | "success" | "error";

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
  const [testState, setTestState] = useState<Record<string, TestState>>({});
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});
  const [smartKeyInput, setSmartKeyInput] = useState<string>("");
  const [autoDetectedMessage, setAutoDetectedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalKeys(apiKeys);
      setTestState({});
      setTestMessage({});
      setAutoDetectedMessage(null);
    }
  }, [isOpen, apiKeys]);

  if (!isOpen) return null;

  const handleKeyChange = (providerId: string, val: string) => {
    setLocalKeys((prev) => ({ ...prev, [providerId]: val }));
    setTestState((prev) => ({ ...prev, [providerId]: "idle" }));
    setTestMessage((prev) => ({ ...prev, [providerId]: "" }));
  };

  const handleSmartKeyPaste = (rawVal: string) => {
    setSmartKeyInput(rawVal);
    const trimmed = rawVal.trim();
    if (!trimmed) return;

    const detected = detectProviderFromKey(trimmed);
    const targetId = detected || activeProviderId || "gemini";
    setLocalKeys((prev) => ({ ...prev, [targetId]: trimmed }));
    onSelectActiveProvider(targetId);
    const prov = PROVIDERS.find((p) => p.id === targetId);
    setAutoDetectedMessage(
      detected
        ? `✓ ${prov?.name || targetId} detected. Click TEST & SAVE to verify and apply this key.`
        : `Key added to ${prov?.name || "Active Provider"}. Click TEST & SAVE to verify and apply this key.`
    );
    setSmartKeyInput("");
  };

  const handleToggleShow = (providerId: string) => {
    setShowKeyMap((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleTestAndSave = async (providerId: string) => {
    const key = localKeys[providerId]?.trim();
    if (!key) {
      setTestState((prev) => ({ ...prev, [providerId]: "error" }));
      setTestMessage((prev) => ({ ...prev, [providerId]: "Enter an API key first." }));
      return;
    }

    setTestState((prev) => ({ ...prev, [providerId]: "testing" }));
    setTestMessage((prev) => ({ ...prev, [providerId]: "" }));
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: key }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "API key verification failed.");
      }

      const nextKeys = { ...localKeys, [providerId]: key };
      setLocalKeys(nextKeys);
      onSaveKeys(nextKeys);
      onSelectActiveProvider(providerId);
      setTestState((prev) => ({ ...prev, [providerId]: "success" }));
      setTestMessage((prev) => ({ ...prev, [providerId]: "Verified & saved automatically" }));
      setAutoDetectedMessage(`✓ ${PROVIDERS.find((p) => p.id === providerId)?.name || providerId} API verified and saved. This provider is now active for the full website.`);
    } catch (error: any) {
      setTestState((prev) => ({ ...prev, [providerId]: "error" }));
      setTestMessage((prev) => ({ ...prev, [providerId]: error?.message || "API key verification failed." }));
    }
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
        className="w-full max-w-[700px] rounded-[16px] overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          background: "#142017",
          border: "1px solid #324E3A",
          boxShadow: "0 0 0 1px rgba(143,191,90,0.1), 0 20px 60px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#2B4432", background: "#0E1510" }}>
          <div>
            <div className="mono text-[13px] tracking-[0.14em] text-[#E6EFE8] font-semibold flex items-center gap-2">
              <Key size={15} className="text-[#8FBF5A]" />
              <span>API SETTINGS</span>
            </div>
            <div className="mono text-[10px] mt-1 text-[#8CA99A]">
              Provider select korun → API key din → TEST & SAVE. Success hole automatically save & active hobe.
            </div>
          </div>
          <button id="modal-close-btn" onClick={onClose} className="w-[32px] h-[32px] rounded-full bg-[#1F3324] border border-[#2B4432] flex items-center justify-center text-[#8CA99A] hover:text-[#E6EFE8] hover:border-[#8FBF5A]/50 transition-colors cursor-pointer" aria-label="Close modal">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scroll-hide flex-1">
          <div className="p-3.5 rounded-[12px] bg-[#1A2A1E] border border-[#8FBF5A]/40 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[11px] font-semibold text-[#8FBF5A] flex items-center gap-1.5"><Sparkles size={13} /> SMART KEY DETECTION</span>
              <span className="mono text-[9px] px-2 py-0.5 rounded bg-[#8FBF5A]/20 text-[#8FBF5A] border border-[#8FBF5A]/30">AUTO</span>
            </div>
            <p className="mono text-[10px] text-[#A8C5B5] mb-2 leading-relaxed">Quickly paste any supported API key. Provider detect hole নিচের correct provider row-e বসে যাবে.</p>
            <input
              id="smart-key-input"
              type="password"
              value={smartKeyInput}
              onChange={(e) => handleSmartKeyPaste(e.target.value)}
              placeholder="Paste API key here for automatic provider detection..."
              className="w-full h-[38px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A] placeholder:text-[#6B8A7A]"
            />
          </div>

          {autoDetectedMessage && (
            <div className="p-3 rounded-[10px] bg-[#1E3325] border border-[#8FBF5A] flex items-center gap-2 mono text-[11px] text-[#8FBF5A] animate-fadeIn">
              <Check size={14} className="shrink-0" /><span>{autoDetectedMessage}</span>
            </div>
          )}

          <div className="px-3 py-2.5 rounded-[9px] bg-[#0E1510] border border-[#2B4432] flex items-center justify-between">
            <span className="mono text-[10px] text-[#6B8A7A]">ACTIVE PROVIDER / MODEL</span>
            <span className="mono text-[11px] font-semibold text-[#8FBF5A] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8FBF5A] shadow-[0_0_8px_#8FBF5A]" /> {activeProvider.name} — {activeProvider.model}
            </span>
          </div>

          <div className="mono text-[11px] font-semibold tracking-wider text-[#E6EFE8]">API PROVIDERS</div>

          <div className="space-y-2.5">
            {PROVIDERS.map((prov) => {
              const isSelected = activeProviderId === prov.id;
              const hasKey = Boolean(localKeys[prov.id]?.trim());
              const hasEnvGemini = prov.id === "gemini" && hasServerGeminiKey;
              const isConfigured = hasKey || hasEnvGemini;
              const isVisible = Boolean(showKeyMap[prov.id]);
              const state = testState[prov.id] || "idle";

              return (
                <div key={prov.id} id={`provider-row-${prov.id}`} className={`rounded-[12px] p-3.5 border transition-all ${isSelected ? "bg-[#1F3324] border-[#8FBF5A]/60 shadow-[0_0_12px_rgba(143,191,90,0.15)]" : "bg-[#0E1510] border-[#2B4432] hover:border-[#324E3A]"}`}>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-[8px] h-[8px] rounded-full shrink-0 ${isConfigured ? "bg-[#8FBF5A] shadow-[0_0_8px_rgba(143,191,90,0.6)]" : "bg-[#2B4432]"}`} />
                      <span className="mono text-[12px] font-semibold text-[#E6EFE8]">{prov.name}</span>
                      <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-[#142017] border border-[#2B4432] text-[#8CA99A] truncate">{prov.model}</span>
                      {isSelected && <span className="mono text-[8px] px-1.5 py-0.5 rounded-full bg-[#8FBF5A] text-[#0E1510] font-semibold shrink-0">ACTIVE</span>}
                    </div>
                    {hasEnvGemini && !hasKey && <span className="mono text-[8px] px-1.5 py-0.5 rounded bg-[#8FBF5A]/20 text-[#8FBF5A] border border-[#8FBF5A]/30 shrink-0">ENV READY</span>}
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1 min-w-0">
                      <input
                        id={`key-input-${prov.id}`}
                        value={localKeys[prov.id] || ""}
                        onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                        placeholder={hasEnvGemini ? "Server key ready — or paste your own key" : `Paste ${prov.name} API key`}
                        type={isVisible ? "text" : "password"}
                        className="w-full h-[40px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] pl-3 pr-9 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/70 placeholder:text-[#6B8A7A]"
                      />
                      <button type="button" onClick={() => handleToggleShow(prov.id)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B8A7A] hover:text-[#8CA99A] cursor-pointer" tabIndex={-1} aria-label="Toggle API key visibility">
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button
                      id={`test-save-${prov.id}`}
                      type="button"
                      onClick={() => handleTestAndSave(prov.id)}
                      disabled={state === "testing" || !hasKey}
                      className={`h-[40px] min-w-[112px] px-3 rounded-[8px] mono text-[10px] font-semibold tracking-wide border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${state === "success" ? "bg-[#8FBF5A] text-[#0E1510] border-[#8FBF5A]" : state === "error" ? "bg-[#3A1D1D] text-[#FF9B9B] border-[#7A3434]" : "bg-[#1F3324] text-[#8FBF5A] border-[#8FBF5A]/50 hover:bg-[#28432E]"}`}
                    >
                      {state === "testing" ? <LoaderCircle size={13} className="animate-spin" /> : state === "success" ? <ShieldCheck size={13} /> : state === "error" ? <CircleAlert size={13} /> : <Check size={13} />}
                      <span>{state === "testing" ? "TESTING…" : state === "success" ? "SAVED" : state === "error" ? "RETRY" : "TEST & SAVE"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 mono text-[9px] mt-2">
                    <span className="text-[#6B8A7A] truncate">{prov.description}</span>
                    <span className={`${state === "success" ? "text-[#8FBF5A]" : state === "error" ? "text-[#FF9B9B]" : "text-[#6B8A7A]"} shrink-0`}>
                      {testMessage[prov.id] || prov.endpoint}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-3" style={{ borderColor: "#2B4432", background: "#0E1510" }}>
          <span className="mono text-[9px] text-[#6B8A7A]">✓ Successful TEST automatically saves & activates the provider.</span>
          <button id="modal-done-btn" onClick={onClose} className="h-[40px] px-5 rounded-[9px] bg-[#1F3324] border border-[#2B4432] text-[#E6EFE8] mono text-[10px] font-semibold hover:border-[#8FBF5A]/50 cursor-pointer">DONE</button>
        </div>
      </div>
    </div>
  );
};
