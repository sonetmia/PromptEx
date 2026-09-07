import React, { useState } from "react";
import { X, LoaderCircle, CircleAlert, Check, Copy, Edit2, RotateCw } from "lucide-react";
import { ImageItem, ExecutionMode } from "../types";

interface ImageCardProps {
  item: ImageItem;
  mode: ExecutionMode;
  onRemove: (id: string) => void;
  onRetry: (item: ImageItem) => void;
  onUpdateResult: (id: string, updatedTitle: string, updatedKeywords: string[]) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  mode,
  onRemove,
  onRetry,
  onUpdateResult,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.result?.title || "");
  const [editKeywordsStr, setEditKeywordsStr] = useState(
    item.result?.keywords.join(", ") || ""
  );
  const [showAllTags, setShowAllTags] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSaveEdit = () => {
    const newTags = editKeywordsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    onUpdateResult(item.id, editTitle, newTags);
    setIsEditing(false);
  };

  return (
    <div
      id={`image-card-${item.id}`}
      className="rounded-[14px] overflow-hidden group transition-all"
      style={{ background: "#1A2A1E", border: "1px solid #2B4432" }}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] bg-[#0E1510] overflow-hidden">
        <img
          src={item.preview}
          alt={item.file.name}
          className="w-full h-full object-cover select-none"
        />

        {/* Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span
            className={`mono text-[10px] px-2 py-0.5 rounded-full border backdrop-blur font-medium ${
              item.status === "done"
                ? "bg-[#8FBF5A]/20 text-[#8FBF5A] border-[#8FBF5A]/30"
                : item.status === "processing"
                ? "bg-[#1F3324]/90 text-[#E6EFE8] border-[#2B4432]"
                : item.status === "error"
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : "bg-[#1A2A1E]/85 text-[#8CA99A] border-[#2B4432]"
            }`}
          >
            {item.status.toUpperCase()}
          </span>
        </div>

        {/* Remove Card Button */}
        <button
          id={`remove-image-${item.id}`}
          onClick={() => onRemove(item.id)}
          className="absolute top-2.5 right-2.5 w-[28px] h-[28px] rounded-full bg-[#0E1510]/80 border border-[#2B4432] text-[#8CA99A] flex items-center justify-center hover:bg-[#1F3324] hover:text-[#E6EFE8] transition-colors z-10 cursor-pointer"
          title="Remove image"
          aria-label="Remove image"
        >
          <X size={14} />
        </button>

        {/* Processing Spinner Overlay */}
        {item.status === "processing" && (
          <div className="absolute inset-0 bg-[#0E1510]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-20">
            <LoaderCircle className="animate-spin text-[#8FBF5A]" size={28} />
            <span className="mono text-[11px] text-[#8FBF5A] font-medium tracking-wide">
              Analyzing vision...
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4">
        {item.result ? (
          <div className="space-y-3">
            {/* Title / Header */}
            {isEditing ? (
              <div className="space-y-2">
                <label className="mono text-[10px] text-[#8FBF5A]">EDIT TITLE</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-[6px] bg-[#0E1510] border border-[#2B4432] px-2 py-1 mono text-[12px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A]"
                />
                <label className="mono text-[10px] text-[#8FBF5A] block mt-2">
                  EDIT TAGS (COMMA-SEPARATED)
                </label>
                <textarea
                  value={editKeywordsStr}
                  onChange={(e) => setEditKeywordsStr(e.target.value)}
                  rows={3}
                  className="w-full rounded-[6px] bg-[#0E1510] border border-[#2B4432] p-2 mono text-[11px] text-[#E6EFE8] outline-none focus:border-[#8FBF5A] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary-3d px-3 py-1 rounded-[6px] mono text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="btn-primary-3d px-3 py-1 rounded-[6px] mono text-[10px] text-[#0E1510] font-semibold"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="mono text-[12px] leading-snug font-medium text-[#E6EFE8] line-clamp-2">
                    {item.result.title}
                  </div>
                  <button
                    onClick={() => {
                      setEditTitle(item.result?.title || "");
                      setEditKeywordsStr(item.result?.keywords.join(", ") || "");
                      setIsEditing(true);
                    }}
                    className="text-[#6B8A7A] hover:text-[#8FBF5A] shrink-0 p-1 transition-colors"
                    title="Edit title & tags"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>

                {/* Keywords Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="mono text-[10px] text-[#6B8A7A] tracking-wider flex items-center gap-1.5">
                      <span>BUYER TAGS</span>
                      <span className="text-[#8FBF5A] font-semibold">({item.result.keywords.length})</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.result?.keywords.join(", ") || "", "tags")}
                      className="mono text-[9px] text-[#8CA99A] hover:text-[#8FBF5A] transition-colors cursor-pointer"
                    >
                      {copiedField === "tags" ? "COPIED!" : "COPY ALL"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllTags
                      ? item.result.keywords
                      : item.result.keywords.slice(0, 12)
                    ).map((tag, idx) => (
                      <span
                        key={idx}
                        className="mono text-[10px] px-2 py-0.5 rounded-full bg-[#1F3324] border border-[#2B4432] text-[#8CA99A] hover:text-[#E6EFE8] hover:border-[#8FBF5A]/40 transition-colors cursor-default"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.result.keywords.length > 12 && (
                      <button
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="mono text-[10px] px-2 py-0.5 rounded-full bg-[#1A2A1E] border border-[#2B4432] text-[#8FBF5A] hover:bg-[#1F3324] cursor-pointer"
                      >
                        {showAllTags ? "SHOW LESS" : `+${item.result.keywords.length - 12} MORE`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Description or Prompt Box */}
                <div
                  className="mono text-[11px] leading-relaxed p-2.5 rounded-[8px] bg-[#0E1510] border border-[#1E3325]"
                  style={{ color: "#8CA99A" }}
                >
                  <div className="text-[9px] uppercase tracking-wider mb-1 text-[#6B8A7A]">
                    {mode === "prompt" ? "GENERATION PROMPT" : "COMMERCIAL DESCRIPTION"}
                  </div>
                  {mode === "prompt" ? item.result.prompt : item.result.description}
                </div>

                {/* Copy Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    id={`copy-title-${item.id}`}
                    onClick={() =>
                      copyToClipboard(
                        mode === "prompt" ? item.result!.prompt : item.result!.title,
                        "title"
                      )
                    }
                    className="btn-secondary-3d flex-1 h-[32px] rounded-[8px] mono text-[10px] flex items-center justify-center gap-1.5 text-[#E6EFE8] cursor-pointer"
                  >
                    {copiedField === "title" ? (
                      <>
                        <Check size={12} className="text-[#8FBF5A]" />
                        <span className="text-[#8FBF5A]">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} className="opacity-70" />
                        <span>COPY {mode === "prompt" ? "PROMPT" : "TITLE"}</span>
                      </>
                    )}
                  </button>

                  <button
                    id={`copy-tags-${item.id}`}
                    onClick={() =>
                      copyToClipboard(item.result!.keywords.join(", "), "tags")
                    }
                    className="btn-secondary-3d flex-1 h-[32px] rounded-[8px] mono text-[10px] flex items-center justify-center gap-1.5 text-[#E6EFE8] cursor-pointer"
                  >
                    {copiedField === "tags" ? (
                      <>
                        <Check size={12} className="text-[#8FBF5A]" />
                        <span className="text-[#8FBF5A]">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} className="opacity-70" />
                        <span>COPY TAGS ({item.result.keywords.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : item.error ? (
          <div className="space-y-2">
            <div className="mono text-[11px] flex gap-2 text-red-300 bg-red-950/20 border border-red-900/30 p-2.5 rounded-[8px]">
              <CircleAlert size={14} className="shrink-0 mt-0.5 text-red-400" />
              <span className="break-all">{item.error}</span>
            </div>
            <button
              onClick={() => onRetry(item)}
              className="btn-secondary-3d w-full h-[30px] rounded-[8px] mono text-[10px] flex items-center justify-center gap-1.5 text-[#8CA99A] hover:text-[#E6EFE8]"
            >
              <RotateCw size={11} />
              <span>RETRY IMAGE</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mono text-[11px]" style={{ color: "#6B8A7A" }}>
            <span className="truncate max-w-[180px]">{item.file.name}</span>
            <span>{(item.file.size / 1024).toFixed(0)} KB • ready</span>
          </div>
        )}
      </div>
    </div>
  );
};
