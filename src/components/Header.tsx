import React from "react";
import { ExternalLink } from "lucide-react";

interface HeaderProps {
  aiEnabled: boolean;
  onToggleAi: () => void;
  onOpenContact: () => void;
}

export const Header: React.FC<HeaderProps> = ({ aiEnabled, onToggleAi, onOpenContact }) => {
  return (
    <header
      id="app-header"
      className="h-[62px] w-full flex items-center justify-between px-4 md:px-6 border-b sticky top-0 z-30"
      style={{ background: "#0E1510", borderColor: "#1E3325" }}
    >
      <div className="flex items-center gap-3">
        <div className="leading-none">
          <div className="text-[18px] md:text-[20px] tracking-tight">
            <span className="font-light text-[#E6EFE8]">Prompt</span>
            <span className="font-semibold text-[#8FBF5A] ml-1.5">Executor</span>
          </div>
          <div
            className="mono text-[9px] tracking-[0.18em] mt-[3px] opacity-70"
            style={{ color: "#8CA99A" }}
          >
            MICROSTOCK JOURNEY WITH SONET
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          id="contact-btn"
          type="button"
          onClick={onOpenContact}
          className="btn-secondary-3d mono text-[11px] tracking-widest px-4 h-[32px] flex items-center gap-2 rounded-[8px] text-[#E6EFE8] cursor-pointer hover:text-[#8FBF5A] transition-colors"
        >
          CONTACT
        </button>

        <button
          id="toggle-ai-btn"
          onClick={onToggleAi}
          className="btn-secondary-3d flex items-center gap-2 px-3 h-[32px] rounded-[8px] mono text-[11px] cursor-pointer transition-all"
        >
          <span
            className="w-[8px] h-[8px] rounded-full transition-all duration-300"
            style={{
              background: aiEnabled ? "#8FBF5A" : "#6B8A7A",
              boxShadow: aiEnabled ? "0 0 8px rgba(143,191,90,0.8)" : "none",
            }}
          />
          <span style={{ color: aiEnabled ? "#8FBF5A" : "#6B8A7A" }}>
            {aiEnabled ? "AI ON" : "AI OFF"}
          </span>
        </button>
      </div>
    </header>
  );
};
