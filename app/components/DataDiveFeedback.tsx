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
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

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
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreview(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SCREENSHOT_SIZE) {
      setErrorMsg("Screenshot too large (max 5MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file");
      return;
    }
    setScreenshot(file);
    setErrorMsg("");
  }

  function clearScreenshot() {
    setScreenshot(null);
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

      if (screenshot) {
        const formData = new FormData();
        formData.append("siteSlug", siteSlug);
        formData.append("message", message);
        if (email) formData.append("email", email);
        if (page) formData.append("page", page);
        formData.append("screenshot", screenshot);
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
        clearScreenshot();
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

                {/* Screenshot uploader */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {screenshot && screenshotPreview ? (
                    <div className="relative inline-block">
                      <img src={screenshotPreview} alt="Screenshot preview" className="max-h-32 rounded-lg border border-gray-200 dark:border-gray-700" />
                      <button
                        type="button"
                        onClick={clearScreenshot}
                        className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-700"
                        aria-label="Remove screenshot"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg w-full justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Attach screenshot (optional)
                    </button>
                  )}
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
