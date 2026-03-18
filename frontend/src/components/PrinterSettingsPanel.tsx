"use client";

import { useState, useEffect } from "react";
import { Printer, Wifi, CheckCircle2, RefreshCw, X, AlertCircle } from "lucide-react";

interface PrinterConfig {
  name: string;
  status: "online" | "offline" | "unknown";
}

export default function PrinterSettingsPanel({ onClose }: { onClose: () => void }) {
  const [printerName, setPrinterName] = useState("");
  const [saved, setSaved] = useState<PrinterConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("printer_config");
    if (s) {
      const c: PrinterConfig = JSON.parse(s);
      setSaved(c);
      setPrinterName(c.name);
    }
  }, []);

  async function testConnection() {
    if (!printerName.trim()) return;
    setTesting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4001"}/printer-status?name=${encodeURIComponent(printerName)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      const data = await res.json();
      const config: PrinterConfig = { name: printerName, status: data.online ? "online" : "offline" };
      setSaved(config);
      localStorage.setItem("printer_config", JSON.stringify(config));
    } catch {
      const config: PrinterConfig = { name: printerName, status: "unknown" };
      setSaved(config);
      localStorage.setItem("printer_config", JSON.stringify(config));
    }
    setTesting(false);
  }

  function savePrinter() {
    if (!printerName.trim()) return;
    const config: PrinterConfig = { name: printerName, status: saved?.status || "unknown" };
    localStorage.setItem("printer_config", JSON.stringify(config));
    window.dispatchEvent(new Event("storage")); // notify header badge
    setSaved(config);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  const statusColor =
    saved?.status === "online" ? "var(--green)"
    : saved?.status === "offline" ? "var(--red)"
    : "var(--orange)";

  const statusBg =
    saved?.status === "online" ? "var(--green-light)"
    : saved?.status === "offline" ? "var(--red-light)"
    : "var(--orange-light)";

  const StatusIcon =
    saved?.status === "online" ? CheckCircle2
    : AlertCircle;

  return (
    <div className="overlay flex items-end sm:items-center justify-center z-50">
      <div
        className="slide-in w-full sm:max-w-md sm:mx-4 overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px 20px 20px 20px",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd" }}
            >
              <Printer className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Printer Settings</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Connect your wired printer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: "var(--bg-muted)", color: "var(--text-second)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current status pill */}
          {saved && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ background: statusBg, border: `1px solid ${statusColor}44` }}
            >
              <StatusIcon className="w-5 h-5 flex-shrink-0" style={{ color: statusColor }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{saved.name}</p>
                <p className="text-xs font-semibold capitalize" style={{ color: statusColor }}>
                  {saved.status === "unknown" ? "Status Unknown (agent offline?)" : saved.status}
                </p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-second)" }}>
              Windows Printer Name
            </label>
            <input
              type="text"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="e.g. XEROX WorkCentre 6515"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-dark)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-dark)")}
              onKeyDown={(e) => e.key === "Enter" && savePrinter()}
            />
          </div>

          {/* How-to box */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd" }}
          >
            <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
              📋 How to find your printer name
            </p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "var(--text-second)" }}>
              <li>Press <strong>Win + R</strong>, type <code className="px-1 py-0.5 rounded" style={{ background: "white" }}>cmd</code>, press Enter</li>
              <li>Run: <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: "white", color: "var(--accent)" }}>wmic printer get name</code></li>
              <li>Copy your wired printer&apos;s name <strong>exactly</strong></li>
              <li>Paste it above and click <strong>Save</strong></li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={testConnection}
              disabled={!printerName.trim() || testing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border-dark)",
                color: "var(--text-second)",
              }}
            >
              {testing
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Testing...</>
                : <><Wifi className="w-4 h-4" />Test</>}
            </button>
            <button
              onClick={savePrinter}
              disabled={!printerName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 text-white"
              style={{
                background: justSaved
                  ? "var(--green)"
                  : "linear-gradient(135deg, #3b7ef8, #6366f1)",
                boxShadow: "0 4px 12px rgba(59,126,248,0.3)",
              }}
            >
              {justSaved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : "Save Printer"}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="px-5 py-3 text-xs"
          style={{ background: "var(--bg-muted)", borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          💡 Also update <code style={{ color: "var(--accent)" }}>PRINTER_NAME</code> in <code style={{ color: "var(--accent)" }}>local-print-agent/.env</code> to match.
        </div>
      </div>
    </div>
  );
}
