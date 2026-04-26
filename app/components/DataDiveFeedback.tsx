"use client";

/**
 * Data Dive Feedback Widget
 *
 * Drop-in floating feedback button. Submissions are filed as GitHub issues
 * tagged `data-dive-feedback` in the corresponding repo via the Data Dive
 * API. Claude can then query them at session start alongside engagement
 * metrics and regression alerts.
 *
 * Usage:
 *   <DataDiveFeedback siteSlug="paul-skenes" />
 *
 * Optional props:
 *   accentColor   - hex/CSS color for the button (default #2563eb)
 *   position      - "bottom-right" (default) | "bottom-left"
 *   apiBase       - override the Data Dive API base URL (default production)
 */

import { useState, useEffect, useRef } from "react";

interface Props {
  siteSlug: string;
  accentColor?: string;
  position?: "bottom-right" | "bottom-left";
  apiBase?: string;
}

const DEFAULT_API = "https://data-dive-sean-tarzys-projects.vercel.app";
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20 MB — supports multi-page illustrated PDFs
const ACCEPTED_MIME = "image/png,image/jpeg,image/gif,image/webp,application/pdf";

export default function DataDiveFeedback({
  siteSlug,
  accentColor = "#2563eb",
  position = "bottom-right",
  apiBase = DEFAULT_API,
}: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const urls = attachments.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => {
      for (const u of urls) if (u) URL.revokeObjectURL(u);
    };
  }, [attachments]);

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    const accepted: File[] = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setErrorMsg(`${file.name}: file too large (max 20MB)`);
        continue;
      }
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setErrorMsg(`${file.name}: only images and PDFs are accepted`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
      setCaptions((prev) => [...prev, ...accepted.map(() => "")]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
    // Reset the input so the same file can be re-picked after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => prev.filter((_, i) => i !== index));
  }

  function setCaption(index: number, value: string) {
    setCaptions((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function clearAttachments() {
    setAttachments([]);
    setCaptions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const page = typeof window !== "undefined" ? window.location.pathname : undefined;
      let res: Response;

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append("siteSlug", siteSlug);
        formData.append("message", message);
        if (email) formData.append("email", email);
        if (page) formData.append("page", page);
        for (let i = 0; i < attachments.length; i++) {
          formData.append("attachments", attachments[i]);
          formData.append("captions", captions[i] || "");
        }
        res = await fetch(`${apiBase}/api/feedback`, { method: "POST", body: formData });
      } else {
        res = await fetch(`${apiBase}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteSlug, message, email: email || undefined, page }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setErrorMsg(data.error || "Failed to submit");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setEmail("");
        clearAttachments();
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  const positionClass =
    position === "bottom-right" ? "right-4 bottom-4" : "left-4 bottom-4";

  return (
    <>
      {/* Floating button — collapses to a faint icon to stay out of the user's way */}
      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Show feedback button"
          style={{ backgroundColor: accentColor }}
          className={`fixed ${positionClass} z-50 rounded-full p-2 text-white shadow-sm hover:shadow-md transition-all opacity-40 hover:opacity-90`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      ) : (
        <div className={`fixed ${positionClass} z-50 flex items-stretch shadow-lg rounded-full`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Send feedback"
            style={{ backgroundColor: accentColor }}
            className="flex items-center gap-2 rounded-l-full pl-4 pr-3 py-3 text-white hover:brightness-110 transition-all text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Feedback
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize feedback button"
            style={{ backgroundColor: accentColor }}
            className="rounded-r-full pr-3 pl-1.5 py-3 text-white/70 hover:text-white border-l border-white/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Send feedback</h2>
                <p className="text-sm text-gray-500 mt-1">Bug, idea, or anything else.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {status === "success" ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-gray-700 dark:text-gray-200 font-medium">Thanks!</p>
                <p className="text-sm text-gray-500 mt-1">Your feedback was submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  required
                  minLength={3}
                  maxLength={5000}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, for follow-up)"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Attachments uploader — images + PDFs, multiple files, drag-and-drop */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_MIME}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="relative flex-shrink-0">
                            {previews[i] ? (
                              <img src={previews[i]!} alt={file.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                            ) : (
                              <div className="h-16 w-16 flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                </svg>
                                <span className="text-[10px] text-gray-500 mt-1 truncate max-w-full">{file.name.split('.').pop()?.toUpperCase()}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAttachment(i)}
                              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
                              aria-label={`Remove ${file.name}`}
                            >
                              ×
                            </button>
                          </div>
                          <input
                            type="text"
                            value={captions[i] || ""}
                            onChange={(e) => setCaption(i, e.target.value)}
                            placeholder="Add a note for this image (optional)"
                            maxLength={200}
                            className="flex-1 self-center px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                    className={`flex items-center gap-2 text-sm px-3 py-2 border border-dashed rounded-lg w-full justify-center cursor-pointer transition-colors ${
                      dragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    {dragOver
                      ? "Drop files to attach"
                      : attachments.length === 0
                        ? "Drop or click to attach screenshots / PDFs"
                        : "Drop or click to add another file"}
                  </div>
                </div>

                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={status === "submitting" || message.trim().length < 3}
                  style={{ backgroundColor: accentColor }}
                  className="w-full py-2.5 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {status === "submitting" ? "Sending..." : "Send feedback"}
                </button>
                <p className="text-xs text-center text-gray-400">
                  Powered by{" "}
                  <a
                    href="https://data-dive-sean-tarzys-projects.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-600"
                  >
                    Data Dive
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
