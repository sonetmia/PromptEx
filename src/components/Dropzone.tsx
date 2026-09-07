import React, { useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { ExecutionMode } from "../types";

interface DropzoneProps {
  mode: ExecutionMode;
  onFilesSelected: (files: FileList | File[]) => void;
  onBrowseClick: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  mode,
  onFilesSelected,
  onBrowseClick,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div id="empty-state-dropzone" className="max-w-[720px] mx-auto mt-8 md:mt-16">
      <div
        className="rounded-[16px] p-6 md:p-8 olive-glow"
        style={{
          background: "#1A2A1E",
          border: "1px solid #2B4432",
          borderLeft: "2px solid rgba(143,191,90,0.35)",
        }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onBrowseClick}
          className={`rounded-[12px] border-dashed border-[1.5px] flex flex-col items-center justify-center py-14 px-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? "bg-[#8FBF5A]/10 border-[#8FBF5A]"
              : "bg-[#0E1510]/50 border-[#324E3A] hover:border-[#8FBF5A]/40"
          }`}
        >
          <div
            className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-4"
            style={{ background: "#1F3324", border: "1px solid #2B4432" }}
          >
            <Upload size={20} color="#8FBF5A" />
          </div>

          <div className="mono text-[13px] tracking-wide text-[#E6EFE8] font-medium">
            {mode === "metadata" ? "Drop images here" : "Drop or paste (Ctrl+V)"}
          </div>

          <div className="mono text-[11px] mt-2" style={{ color: "#6B8A7A" }}>
            {mode === "metadata"
              ? "Batch upload supported"
              : "Image to prompt • real vision AI"}
          </div>

          <div
            className="mono text-[10px] mt-3 px-2.5 py-1 rounded-full bg-[#1F3324] border border-[#2B4432]"
            style={{ color: "#8CA99A" }}
          >
            JPG • PNG • WEBP • SVG
          </div>

          <button
            type="button"
            className="btn-secondary-3d mt-6 mono text-[11px] tracking-widest px-5 h-[34px] rounded-[10px] text-[#E6EFE8] cursor-pointer"
          >
            BROWSE FILES
          </button>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-[#1A2A1E] border border-[#2B4432]">
          <ImageIcon size={16} color="#6B8A7A" />
        </div>
        <div className="mono text-[12px] text-[#8CA99A]">No assets</div>
        <div className="mono text-[11px]" style={{ color: "#6B8A7A" }}>
          Upload to generate
        </div>
      </div>
    </div>
  );
};
