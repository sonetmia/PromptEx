import React, { useState } from "react";
import { X, User, MessageCircle, Mail, Globe, Copy, Check, ExternalLink } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const contactOptions = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      value: "01797953059",
      href: "https://wa.me/8801797953059",
      actionText: "Chat on WhatsApp",
      icon: MessageCircle,
      badge: "Fast Response",
    },
    {
      id: "gmail",
      label: "Gmail",
      value: "md.sonet.mia01@gmail.com",
      href: "mailto:md.sonet.mia01@gmail.com",
      actionText: "Send Email",
      icon: Mail,
      badge: "Direct Mail",
    },
    {
      id: "website",
      label: "Website",
      value: "mdsonetmia.vercel.app",
      href: "https://mdsonetmia.vercel.app",
      actionText: "Visit Portfolio",
      icon: Globe,
      badge: "Portfolio",
    },
  ];

  return (
    <div
      id="contact-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="contact-modal-container"
        className="w-full max-w-[500px] rounded-[16px] overflow-hidden flex flex-col"
        style={{
          background: "#142017",
          border: "1px solid #324E3A",
          boxShadow: "0 0 0 1px rgba(143,191,90,0.1), 0 20px 60px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "#2B4432", background: "#0E1510" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-[#1F3324] border border-[#2B4432] flex items-center justify-center text-[#8FBF5A]">
              <User size={18} />
            </div>
            <div>
              <div className="mono text-[13px] tracking-[0.14em] text-[#E6EFE8] font-semibold">
                CONTACT INFORMATION
              </div>
              <div className="mono text-[10px] text-[#8CA99A] mt-0.5">
                Microstock Journey With Sonet
              </div>
            </div>
          </div>

          <button
            id="close-contact-modal-btn"
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#1F3324] border border-[#2B4432] text-[#8CA99A] hover:text-[#E6EFE8] hover:border-[#8FBF5A]/50 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close contact modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Creator Profile Card */}
          <div className="p-4 rounded-[12px] bg-[#0E1510] border border-[#2B4432] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full bg-[#1F3324] border border-[#8FBF5A]/40 flex items-center justify-center text-[#8FBF5A] font-bold mono text-sm shadow-[0_0_12px_rgba(143,191,90,0.15)]">
                SM
              </div>
              <div>
                <div className="mono text-[13px] font-semibold text-[#E6EFE8]">
                  Md Sonet Mia
                </div>
                <div className="mono text-[10px] text-[#8FBF5A] flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8FBF5A] animate-pulse" />
                  <span>Creator & Developer</span>
                </div>
              </div>
            </div>
            <span className="mono text-[9px] px-2 py-1 rounded bg-[#1F3324] border border-[#2B4432] text-[#8CA99A]">
              AVAILABLE
            </span>
          </div>

          {/* 3 Contact Options */}
          <div className="space-y-2.5">
            <div className="mono text-[10px] font-semibold tracking-wider text-[#8CA99A] px-1">
              CONTACT OPTIONS
            </div>

            {contactOptions.map((opt) => {
              const Icon = opt.icon;
              const isCopied = copiedKey === opt.id;

              return (
                <div
                  key={opt.id}
                  id={`contact-option-${opt.id}`}
                  className="rounded-[12px] p-3.5 bg-[#0E1510] border border-[#2B4432] hover:border-[#324E3A] transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-[28px] h-[28px] rounded-[7px] bg-[#1F3324] border border-[#2B4432] flex items-center justify-center text-[#8FBF5A]">
                        <Icon size={14} />
                      </div>
                      <span className="mono text-[11px] font-semibold text-[#E6EFE8]">
                        {opt.label}
                      </span>
                    </div>

                    <span className="mono text-[9px] px-2 py-0.5 rounded bg-[#1F3324] border border-[#2B4432] text-[#8CA99A]">
                      {opt.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-9">
                    <span className="mono text-[12px] text-[#A8C5B5] select-all font-medium truncate">
                      {opt.value}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        id={`copy-${opt.id}-btn`}
                        onClick={() => handleCopy(opt.value, opt.id)}
                        className="h-[28px] px-2.5 rounded-[6px] bg-[#1F3324] hover:bg-[#2B4432] border border-[#2B4432] hover:border-[#8FBF5A]/40 text-[#8CA99A] hover:text-[#E6EFE8] mono text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Copy ${opt.label}`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={11} className="text-[#8FBF5A]" />
                            <span className="text-[#8FBF5A]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <a
                        id={`open-${opt.id}-link`}
                        href={opt.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-[28px] px-3 rounded-[6px] bg-[#8FBF5A]/15 hover:bg-[#8FBF5A]/25 border border-[#8FBF5A]/40 hover:border-[#8FBF5A] text-[#8FBF5A] mono text-[10px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <span>{opt.actionText}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex justify-end"
          style={{ borderColor: "#2B4432", background: "#0E1510" }}
        >
          <button
            id="close-contact-modal-footer-btn"
            onClick={onClose}
            className="w-full h-[36px] rounded-[8px] bg-[#1F3324] hover:bg-[#2B4432] border border-[#2B4432] hover:border-[#8FBF5A]/40 text-[#E6EFE8] mono text-[11px] font-semibold tracking-wider transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
