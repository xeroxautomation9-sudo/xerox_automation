"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, CheckCircle2, X, RefreshCw, Smartphone, AlertCircle, Loader2 } from "lucide-react";

type StatusType = "loading" | "connected" | "qr_ready" | "waiting" | "error";

interface WaState {
  status: StatusType;
  qr: string | null;
  phone: string | null;
  error: string | null;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function WhatsAppPanel({ onClose }: { onClose: () => void }) {
  const [wa, setWa] = useState<WaState>({ status: "loading", qr: null, phone: null, error: null });
  const [polling, setPolling] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/whatsapp/qr`, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();

      if (data.connected) {
        setWa({ status: "connected", qr: null, phone: data.phone ?? null, error: null });
        setPolling(false); // stop polling once connected
      } else if (data.qr) {
        setWa({ status: "qr_ready", qr: data.qr, phone: null, error: null });
      } else {
        setWa({ status: "waiting", qr: null, phone: null, error: data.message ?? null });
      }
    } catch {
      setWa({
        status: "error",
        qr: null,
        phone: null,
        error: "Cannot reach backend. Make sure the backend is running on port 4000.",
      });
      setPolling(false);
    }
  }, []);

  // Poll every 3 seconds while not connected
  useEffect(() => {
    fetchStatus();
    if (!polling) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus, polling]);

  function retry() {
    setWa({ status: "loading", qr: null, phone: null, error: null });
    setPolling(true);
    fetchStatus();
  }

  return (
    <div className="overlay flex items-end sm:items-center justify-center z-50">
      <div
        className="slide-in w-full sm:max-w-md sm:mx-4 overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#ecfdf5", border: "1px solid #6ee7b7" }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>WhatsApp Link</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Scan to connect your business number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "var(--bg-muted)", color: "var(--text-second)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-4">

          {/* ✅ Connected State */}
          {wa.status === "connected" && (
            <div className="space-y-4 fade-up">
              <div
                className="flex flex-col items-center gap-3 p-6 rounded-2xl text-center"
                style={{ background: "var(--green-light)", border: "1px solid #6ee7b7" }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#d1fae5" }}>
                  <CheckCircle2 className="w-9 h-9" style={{ color: "var(--green)" }} />
                </div>
                <div>
                  <p className="text-base font-extrabold" style={{ color: "var(--green)" }}>WhatsApp Connected!</p>
                  {wa.phone && (
                    <p className="text-sm mt-1" style={{ color: "var(--text-second)" }}>
                      <Smartphone className="inline w-4 h-4 mr-1" />+{wa.phone}
                    </p>
                  )}
                </div>
              </div>
              <div
                className="p-4 rounded-xl text-sm space-y-2"
                style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
              >
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>✅ System is fully live</p>
                <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: "var(--text-second)" }}>
                  <li>Customers can now send files to your WhatsApp</li>
                  <li>Orders will appear automatically in the queue</li>
                  <li>AI will parse print requirements from messages</li>
                </ul>
              </div>
            </div>
          )}

          {/* 📱 QR Ready — show it */}
          {wa.status === "qr_ready" && wa.qr && (
            <div className="space-y-4 fade-up">
              <div
                className="rounded-2xl p-4 text-center space-y-3"
                style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                  Scan this QR with WhatsApp
                </p>
                <div className="flex justify-center">
                  {/* QR Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={wa.qr}
                    alt="WhatsApp QR Code"
                    className="rounded-xl shadow-md"
                    style={{ width: 230, height: 230, border: "4px solid white" }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  Refreshing automatically every 3s
                </div>
              </div>

              {/* Steps */}
              <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>📱 How to scan</p>
                {[
                  "Open WhatsApp on your phone",
                  "Go to Settings → Linked Devices",
                  "Tap 'Link a Device'",
                  "Point camera at the QR code above",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5"
                      style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid #bdd1fd" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-second)" }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⏳ Loading / Waiting for QR */}
          {(wa.status === "loading" || wa.status === "waiting") && (
            <div className="space-y-4 fade-up">
              <div
                className="flex flex-col items-center gap-3 p-8 rounded-2xl text-center"
                style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
              >
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--accent)" }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {wa.status === "loading" ? "Connecting to backend..." : "Waiting for WhatsApp to initialize..."}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {wa.status === "waiting"
                      ? "WhatsApp is starting up. The QR code will appear shortly."
                      : "Checking backend connection..."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ❌ Error State */}
          {wa.status === "error" && (
            <div className="space-y-4 fade-up">
              <div
                className="flex flex-col items-center gap-3 p-6 rounded-2xl text-center"
                style={{ background: "var(--red-light)", border: "1px solid #fca5a5" }}
              >
                <AlertCircle className="w-10 h-10" style={{ color: "var(--red)" }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--red)" }}>Backend Unreachable</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-second)" }}>
                    {wa.error}
                  </p>
                </div>
              </div>
              <div
                className="p-4 rounded-xl text-xs space-y-2"
                style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text-second)" }}
              >
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>To fix this:</p>
                <p>1. Open a CMD window in your project folder</p>
                <p>2. Run: <code className="px-1.5 py-0.5 rounded" style={{ background: "white", color: "var(--accent)" }}>cd backend &amp;&amp; npm.cmd run dev</code></p>
                <p>3. Return here and click Retry</p>
              </div>
              <button
                onClick={retry}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #3b7ef8, #6366f1)", boxShadow: "0 4px 12px rgba(59,126,248,0.3)" }}
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3 text-xs"
          style={{ background: "var(--bg-muted)", borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          💡 The QR code expires every ~20 seconds. A new one appears automatically.
        </div>
      </div>
    </div>
  );
}
