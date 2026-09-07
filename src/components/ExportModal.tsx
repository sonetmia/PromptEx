import React, { useState } from "react";
import { X, Download, Copy, Check, FileSpreadsheet, FileCode, FileText } from "lucide-react";
import { ImageItem, StockPlatform } from "../types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ImageItem[];
  platforms: StockPlatform[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  items,
  platforms,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<"adobestock" | "shutterstock" | "freepik" | "json" | "txt">("adobestock");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const completedItems = items.filter((it) => it.status === "done" && it.result);

  const generateCsv = (format: "adobestock" | "shutterstock" | "freepik"): string => {
    if (format === "adobestock") {
      const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
      const rows = completedItems.map((it) => {
        const filename = it.file.name;
        const title = `"${(it.result?.title || "").replace(/"/g, '""')}"`;
        const keywords = `"${(it.result?.keywords || []).join(",")}"`;
        const category = "1"; // General/Default Adobe Stock category code
        const releases = "";
        return [filename, title, keywords, category, releases].join(",");
      });
      return [headers.join(","), ...rows].join("\n");
    }

    if (format === "shutterstock") {
      const headers = ["Filename", "Description", "Keywords", "Categories", "Illustration", "Mature content"];
      const rows = completedItems.map((it) => {
        const filename = it.file.name;
        const desc = `"${(it.result?.title || it.result?.description || "").replace(/"/g, '""')}"`;
        const keywords = `"${(it.result?.keywords || []).join(",")}"`;
        const categories = `"Commercial"`;
        const illustration = "No";
        const mature = "No";
        return [filename, desc, keywords, categories, illustration, mature].join(",");
      });
      return [headers.join(","), ...rows].join("\n");
    }

    // Freepik
    const headers = ["Filename", "Title", "Keywords"];
    const rows = completedItems.map((it) => {
      const filename = it.file.name;
      const title = `"${(it.result?.title || "").replace(/"/g, '""')}"`;
      const keywords = `"${(it.result?.keywords || []).join(",")}"`;
      return [filename, title, keywords].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  };

  const generateJson = (): string => {
    const data = completedItems.map((it) => ({
      filename: it.file.name,
      fileSize: it.file.size,
      mimeType: it.mime,
      title: it.result?.title,
      keywords: it.result?.keywords,
      description: it.result?.description,
      prompt: it.result?.prompt,
      platforms,
    }));
    return JSON.stringify(data, null, 2);
  };

  const generateTxt = (): string => {
    return completedItems
      .map((it) => it.result?.prompt?.trim())
      .filter(Boolean)
      .join("\n\n");
  };

  const currentContent =
    selectedFormat === "json"
      ? generateJson()
      : selectedFormat === "txt"
      ? generateTxt()
      : generateCsv(selectedFormat);

  const handleDownload = () => {
    const isJson = selectedFormat === "json";
    const isTxt = selectedFormat === "txt";
    const mimeType = isJson
      ? "application/json"
      : isTxt
      ? "text/plain;charset=utf-8;"
      : "text/csv;charset=utf-8;";
    const ext = isJson ? "json" : isTxt ? "txt" : "csv";

    const blob = new Blob([currentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isTxt
      ? `adobestock-prompts-${Date.now()}.txt`
      : `microstock-metadata-${selectedFormat}-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        id="export-modal-container"
        className="w-full max-w-[620px] rounded-[16px] overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          background: "#1A2A1E",
          border: "1px solid #324E3A",
          boxShadow: "0 0 0 1px rgba(143,191,90,0.1), 0 20px 60px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "#2B4432" }}
        >
          <div>
            <div className="mono text-[12px] tracking-[0.14em] text-[#E6EFE8] font-medium">
              EXPORT METADATA • {completedItems.length} ASSETS
            </div>
            <div className="mono text-[10px] mt-1" style={{ color: "#6B8A7A" }}>
              Standard CSV templates ready for direct upload to contributor portals
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full bg-[#1F3324] border border-[#2B4432] flex items-center justify-center text-[#8CA99A] hover:text-[#E6EFE8] hover:border-[#8FBF5A]/50 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Format selector tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "adobestock", label: "Adobe Stock CSV", icon: FileSpreadsheet },
              { id: "txt", label: "Prompts Only (.txt)", icon: FileText },
              { id: "shutterstock", label: "Shutterstock CSV", icon: FileSpreadsheet },
              { id: "freepik", label: "Freepik CSV", icon: FileSpreadsheet },
              { id: "json", label: "JSON Data", icon: FileCode },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isActive = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`mono text-[11px] px-3.5 py-1.5 rounded-[8px] flex items-center gap-2 border transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#8FBF5A] text-[#0E1510] border-[#8FBF5A] font-semibold shadow-[0_0_12px_rgba(143,191,90,0.25)]"
                      : "bg-[#1F3324] text-[#8CA99A] border-[#2B4432] hover:text-[#E6EFE8]"
                  }`}
                >
                  <Icon size={13} />
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preview box */}
          <div className="space-y-1.5">
            <div className="mono text-[10px] text-[#6B8A7A] flex justify-between">
              <span>DATA PREVIEW</span>
              <span>{completedItems.length} items ready</span>
            </div>
            <pre className="p-3.5 rounded-[10px] bg-[#0E1510] border border-[#2B4432] mono text-[11px] text-[#8CA99A] overflow-x-auto max-h-[220px] scroll-hide whitespace-pre-wrap leading-relaxed">
              {currentContent || "No completed items yet. Process metadata first."}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex gap-3"
          style={{ borderColor: "#2B4432", background: "#1A2A1E" }}
        >
          <button
            onClick={handleCopy}
            disabled={completedItems.length === 0}
            className="btn-secondary-3d flex-1 h-[40px] rounded-[10px] mono text-[11px] tracking-widest flex items-center justify-center gap-2 text-[#E6EFE8] cursor-pointer disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#8FBF5A]" />
                <span className="text-[#8FBF5A]">COPIED TO CLIPBOARD</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>COPY CONTENT</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={completedItems.length === 0}
            className="btn-primary-3d flex-1 h-[40px] rounded-[10px] mono text-[11px] tracking-widest font-semibold flex items-center justify-center gap-2 text-[#0E1510] cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>DOWNLOAD {selectedFormat === "txt" ? "PROMPTS (.TXT)" : selectedFormat.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
