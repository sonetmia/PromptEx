import React from "react";
import { Key, Layers, Settings2, Target, Sparkles } from "lucide-react";
import { ExecutionMode, StockPlatform, PLATFORMS, ProviderKeys } from "../types";

interface SidebarProps {
  mode: ExecutionMode;
  onSelectMode: (mode: ExecutionMode) => void;
  selectedPlatforms: StockPlatform[];
  onTogglePlatform: (platform: StockPlatform) => void;
  minTitleWords: number;
  maxTitleWords: number;
  onChangeTitleWords: (min: number, max: number) => void;
  minKeywords: number;
  maxKeywords: number;
  onChangeKeywords: (min: number, max: number) => void;
  customPrompt: string;
  onChangeCustomPrompt: (val: string) => void;
  titlePrefix: string;
  onChangeTitlePrefix: (val: string) => void;
  titleSuffix: string;
  onChangeTitleSuffix: (val: string) => void;
  singleWordOnly: boolean;
  onToggleSingleWord: () => void;
  apiKeys: ProviderKeys;
  hasServerGeminiKey: boolean;
  activeProviderId: string;
  onOpenKeysModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  onSelectMode,
  selectedPlatforms,
  onTogglePlatform,
  minTitleWords,
  maxTitleWords,
  onChangeTitleWords,
  minKeywords,
  maxKeywords,
  onChangeKeywords,
  customPrompt,
  onChangeCustomPrompt,
  titlePrefix,
  onChangeTitlePrefix,
  titleSuffix,
  onChangeTitleSuffix,
  singleWordOnly,
  onToggleSingleWord,
  apiKeys,
  hasServerGeminiKey,
  activeProviderId,
  onOpenKeysModal,
}) => {
  const hasAnyKey =
    hasServerGeminiKey ||
    Object.values(apiKeys).some((k) => typeof k === "string" && Boolean(k.trim()));

  return (
    <aside
      id="app-sidebar"
      className="w-full lg:w-[360px] shrink-0 p-4 md:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r"
      style={{ borderColor: "#1E3325", background: "#0E1510" }}
    >
      {/* API Keys Card (Provider names kept strictly inside modal) */}
      <div
        id="sidebar-api-keys-card"
        className="rounded-[14px] p-4"
        style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div
            className="flex items-center gap-2 mono text-[11px] tracking-[0.14em]"
            style={{ color: "#8FBF5A" }}
          >
            <Key size={14} />
            <span>API KEYS & ENGINE</span>
          </div>
          <span className="mono text-[9px] px-2 py-0.5 rounded-full bg-[#8FBF5A]/15 text-[#8FBF5A] border border-[#8FBF5A]/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FBF5A] animate-pulse" />
            <span>AUTO-SELECTION</span>
          </span>
        </div>

        <div className="text-[11px] mono text-[#8CA99A] leading-relaxed mb-3">
          {hasAnyKey
            ? "API key detected. Vision model is automatically selected based on your key."
            : "Enter an API key to automatically route and select the optimal vision model."}
        </div>

        <button
          id="manage-keys-btn"
          onClick={onOpenKeysModal}
          className="w-full h-[36px] rounded-[8px] bg-[#1F3324] hover:bg-[#2B4432] border border-[#2B4432] hover:border-[#8FBF5A]/50 text-[#E6EFE8] hover:text-[#8FBF5A] mono text-[11px] font-semibold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles size={13} className="text-[#8FBF5A]" />
          <span>MANAGE API KEYS</span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div
        id="sidebar-mode-card"
        className="rounded-[14px] p-4"
        style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
      >
        <div
          className="mono text-[11px] tracking-[0.14em] mb-3 flex items-center gap-2"
          style={{ color: "#8FBF5A" }}
        >
          <Layers size={14} />
          <span>MODE</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            id="mode-metadata-btn"
            onClick={() => onSelectMode("metadata")}
            className={`h-[44px] rounded-[10px] mono text-[11px] tracking-widest font-medium transition-all cursor-pointer ${
              mode === "metadata"
                ? "btn-primary-3d text-[#0E1510] font-semibold"
                : "btn-secondary-3d text-[#8CA99A]"
            }`}
          >
            METADATA
          </button>
          <button
            id="mode-prompt-btn"
            onClick={() => onSelectMode("prompt")}
            className={`h-[44px] rounded-[10px] mono text-[11px] tracking-widest font-medium transition-all cursor-pointer ${
              mode === "prompt"
                ? "btn-primary-3d text-[#0E1510] font-semibold"
                : "btn-secondary-3d text-[#8CA99A]"
            }`}
          >
            IMAGE TO PROMPT
          </button>
        </div>
      </div>

      {/* Microstock Platforms */}
      <div
        id="sidebar-platforms-card"
        className="rounded-[14px] p-4"
        style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
      >
        <div className="mono text-[11px] tracking-[0.14em] mb-3" style={{ color: "#8FBF5A" }}>
          PLATFORMS
        </div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform);
            return (
              <button
                key={platform}
                id={`platform-${platform.toLowerCase()}`}
                onClick={() => onTogglePlatform(platform)}
                className={`mono text-[10px] tracking-widest px-3 h-[28px] rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#8FBF5A] text-[#0E1510] border-[#8FBF5A] font-semibold shadow-[0_0_12px_rgba(143,191,90,0.3)]"
                    : "bg-[#1F3324] text-[#8CA99A] border-[#2B4432] hover:border-[#324E3A]"
                }`}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Card */}
      <div
        id="sidebar-settings-card"
        className="rounded-[14px] p-4"
        style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
      >
        <div
          className="mono text-[11px] tracking-[0.14em] mb-4 flex items-center gap-2"
          style={{ color: "#8FBF5A" }}
        >
          <Settings2 size={14} />
          <span>SETTINGS</span>
        </div>

        <div className="space-y-4">
          <div>
            <div
              className="mono text-[10px] mb-2 flex justify-between"
              style={{ color: "#6B8A7A" }}
            >
              <span>TITLE LENGTH (WORDS)</span>
              <span className="text-[#8CA99A]">
                {minTitleWords}–{maxTitleWords}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                id="min-title-words-input"
                type="number"
                min={1}
                max={50}
                value={minTitleWords}
                onChange={(e) =>
                  onChangeTitleWords(Math.max(1, Number(e.target.value) || 1), maxTitleWords)
                }
                className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[12px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50"
              />
              <input
                id="max-title-words-input"
                type="number"
                min={minTitleWords}
                max={50}
                value={maxTitleWords}
                onChange={(e) =>
                  onChangeTitleWords(minTitleWords, Math.max(minTitleWords, Number(e.target.value) || minTitleWords))
                }
                className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[12px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50"
              />
            </div>
          </div>

          <div>
            <div
              className="mono text-[10px] mb-2 flex justify-between"
              style={{ color: "#6B8A7A" }}
            >
              <span>KEYWORDS COUNT</span>
              <span className="text-[#8CA99A]">
                {minKeywords}–{maxKeywords}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                id="min-keywords-input"
                type="number"
                min={1}
                max={100}
                value={minKeywords}
                onChange={(e) =>
                  onChangeKeywords(Math.max(1, Number(e.target.value) || 1), maxKeywords)
                }
                className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[12px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50"
              />
              <input
                id="max-keywords-input"
                type="number"
                min={minKeywords}
                max={100}
                value={maxKeywords}
                onChange={(e) =>
                  onChangeKeywords(minKeywords, Math.max(minKeywords, Number(e.target.value) || minKeywords))
                }
                className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-3 mono text-[12px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50"
              />
            </div>
          </div>

          <div>
            <div className="mono text-[10px] mb-2" style={{ color: "#6B8A7A" }}>
              CUSTOM PROMPT / INSTRUCTIONS
            </div>
            <textarea
              id="custom-prompt-input"
              value={customPrompt}
              onChange={(e) => onChangeCustomPrompt(e.target.value)}
              placeholder="e.g. vintage style, minimal, isolated on white background"
              rows={2}
              className="w-full rounded-[8px] bg-[#0E1510] border border-[#2B4432] p-2.5 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50 resize-none placeholder:text-[#6B8A7A]"
            />
          </div>

          {/* Custom Title Prefix / Suffix */}
          <div id="sidebar-custom-title-affixes">
            <div className="mono text-[10px] mb-2" style={{ color: "#6B8A7A" }}>
              Custom Title Prefix / Suffix
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mono text-[9px] mb-1 text-[#8CA99A]">Prefix</div>
                <input
                  id="custom-title-prefix-input"
                  type="text"
                  value={titlePrefix}
                  onChange={(e) => onChangeTitlePrefix(e.target.value)}
                  placeholder="e.g. Minimalist"
                  className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-2.5 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50 placeholder:text-[#6B8A7A]"
                />
              </div>
              <div>
                <div className="mono text-[9px] mb-1 text-[#8CA99A]">Suffix</div>
                <input
                  id="custom-title-suffix-input"
                  type="text"
                  value={titleSuffix}
                  onChange={(e) => onChangeTitleSuffix(e.target.value)}
                  placeholder="e.g. Vector Design"
                  className="w-full h-[32px] rounded-[8px] bg-[#0E1510] border border-[#2B4432] px-2.5 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]/50 placeholder:text-[#6B8A7A]"
                />
              </div>
            </div>
          </div>

          {/* Buyer Search SEO Notice */}
          <div className="p-3 rounded-[10px] bg-[#0E1510] border border-[#2B4432]/80 flex items-start gap-2.5">
            <Target size={15} className="text-[#8FBF5A] shrink-0 mt-0.5" />
            <div className="text-[10px] mono leading-relaxed text-[#8CA99A]">
              <span className="text-[#8FBF5A] font-semibold">BUYER-TARGETED SEO:</span> Titles & tags are automatically optimized for graphic designers, marketers, and commercial stock marketplace search volume based on the image design & use cases.
            </div>
          </div>
        </div>
      </div>

      {/* Single-Word Keywords Card */}
      <div
        id="sidebar-single-word-card"
        className="rounded-[14px] p-4 flex items-center justify-between"
        style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
      >
        <div>
          <div className="mono text-[11px] tracking-wide text-[#E6EFE8]">
            Single-Word Keywords
          </div>
          <div className="mono text-[10px] mt-1" style={{ color: "#6B8A7A" }}>
            AdobeStock compliant
          </div>
        </div>

        <button
          id="single-word-toggle-btn"
          onClick={onToggleSingleWord}
          className={`w-[44px] h-[24px] rounded-full p-[2px] transition-all cursor-pointer ${
            singleWordOnly ? "bg-[#8FBF5A]" : "bg-[#1F3324] border border-[#2B4432]"
          }`}
          aria-label="Toggle single-word keywords"
        >
          <div
            className={`w-[20px] h-[20px] rounded-full bg-[#0E1510] transition-transform duration-200 ${
              singleWordOnly ? "translate-x-[20px] shadow" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </aside>
  );
};
