"use client";

import { useState } from "react";
import {
  X, BarChart3, Download, Calendar, IndianRupee,
  Package, Printer, Zap, RefreshCw,
  FileText, AlertCircle
} from "lucide-react";

const BACKEND  = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SHOP_ID  = process.env.NEXT_PUBLIC_SHOP_ID    || "";

interface Summary {
  total_orders: number;
  total_revenue: number;
  bw_orders: number;
  color_orders: number;
  delivered: number;
  pending: number;
  urgent_orders: number;
  avg_order_value: number;
}
interface ReportOrder {
  id: string; short_id: string; status: string; color_mode: string;
  copies: number; duplex: boolean; binding: string; urgency: string;
  total_amount: number; created_at: string;
  customers?: { name?: string; phone?: string };
  order_files?: { file_name?: string }[];
}

type LoadState = "idle" | "loading" | "done" | "error";

// Preset date range helpers
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
const PRESETS = [
  { label: "Today",       from: () => toDateStr(new Date()), to: () => toDateStr(new Date()) },
  { label: "Yesterday",   from: () => { const d = new Date(); d.setDate(d.getDate()-1); return toDateStr(d); }, to: () => { const d = new Date(); d.setDate(d.getDate()-1); return toDateStr(d); } },
  { label: "This Week",   from: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return toDateStr(d); }, to: () => toDateStr(new Date()) },
  { label: "This Month",  from: () => toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: () => toDateStr(new Date()) },
  { label: "Last Month",  from: () => { const d = new Date(); return toDateStr(new Date(d.getFullYear(), d.getMonth()-1, 1)); }, to: () => { const d = new Date(); return toDateStr(new Date(d.getFullYear(), d.getMonth(), 0)); } },
  { label: "All Time",    from: () => "2024-01-01", to: () => toDateStr(new Date()) },
];

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl p-4 space-y-1" style={{ background: color + "10", border: `1px solid ${color}30` }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

export default function ReportsModal({ onClose }: { onClose: () => void }) {
  const today = toDateStr(new Date());
  const [from, setFrom] = useState(today);
  const [to,   setTo]   = useState(today);
  const [activePreset, setActivePreset] = useState(0);
  const [state, setState] = useState<LoadState>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [errMsg, setErrMsg] = useState("");
  const [downloading, setDownloading] = useState(false);

  function applyPreset(idx: number) {
    const p = PRESETS[idx];
    setFrom(p.from()); setTo(p.to()); setActivePreset(idx);
  }

  async function fetchReport(fromDate = from, toDate = to) {
    setState("loading"); setErrMsg("");
    try {
      const url = `${BACKEND}/api/reports/${SHOP_ID}?from=${fromDate}&to=${toDate}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report");
      setSummary(data.summary);
      setOrders(data.orders || []);
      setState("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function downloadCSV() {
    setDownloading(true);
    try {
      const url = `${BACKEND}/api/reports/${SHOP_ID}?from=${from}&to=${to}&format=csv`;
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `PrintOS_Report_${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Failed to download CSV. Make sure the backend is running.");
    }
    setDownloading(false);
  }

  const STATUS_COLOR: Record<string, string> = {
    RECEIVED: "#3b7ef8", PROCESSING: "#f59e0b",
    PRINTED: "#8b5cf6", READY: "#10b981", DELIVERED: "#64748b",
  };

  return (
    <div className="overlay flex items-end sm:items-center justify-center z-50">
      <div
        className="slide-in w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "95vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Reports & Export</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Filter by date range and download CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "var(--bg-muted)", color: "var(--text-second)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Date Range */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Date Range</h3>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => applyPreset(i)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: activePreset === i ? "var(--accent-light)" : "var(--bg-muted)",
                    border: `1px solid ${activePreset === i ? "#bdd1fd" : "var(--border-dark)"}`,
                    color: activePreset === i ? "var(--accent)" : "var(--text-second)",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            <div className="grid grid-cols-2 gap-3">
              {[{ label: "From", val: from, set: setFrom }, { label: "To", val: to, set: setTo }].map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text-second)" }}>
                    <Calendar className="w-3.5 h-3.5" />{label}
                  </label>
                  <input type="date" value={val} max={today}
                    onChange={(e) => { set(e.target.value); setActivePreset(-1); }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border-dark)", color: "var(--text-primary)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-dark)")} />
                </div>
              ))}
            </div>

            {/* Generate button */}
            <button onClick={() => fetchReport(from, to)} disabled={state === "loading"}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#3b7ef8,#6366f1)", boxShadow: "0 4px 12px rgba(59,126,248,0.3)" }}>
              {state === "loading" ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</> : <><BarChart3 className="w-4 h-4" />Generate Report</>}
            </button>
          </section>

          {/* ── Error ── */}
          {state === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-xl fade-up" style={{ background: "var(--red-light)", border: "1px solid #fca5a5" }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--red)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--red)" }}>Failed to load report</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-second)" }}>{errMsg}</p>
              </div>
            </div>
          )}

          {/* ── Report Results ── */}
          {state === "done" && summary && (
            <div className="space-y-5 fade-up">

              {/* Period badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd", color: "var(--accent)" }}>
                  📅 {from === to ? from : `${from} → ${to}`}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{summary.total_orders} orders found</span>
              </div>

              {/* Summary stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={IndianRupee} label="Revenue" value={`₹${summary.total_revenue.toFixed(0)}`}
                  sub={`Avg ₹${summary.avg_order_value.toFixed(0)}`} color="#10b981" />
                <StatCard icon={Package} label="Orders" value={summary.total_orders}
                  sub={`${summary.delivered} delivered`} color="#3b7ef8" />
                <StatCard icon={Printer} label="B&W / Color" value={`${summary.bw_orders} / ${summary.color_orders}`}
                  sub="print jobs" color="#8b5cf6" />
                <StatCard icon={Zap} label="Urgent" value={summary.urgent_orders}
                  sub={`${summary.pending} still pending`} color="#f59e0b" />
              </div>

              {/* Revenue bar */}
              {summary.total_orders > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-second)" }}>
                    <span>Order type split</span>
                    <span>{((summary.color_orders / summary.total_orders) * 100).toFixed(0)}% color</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${(summary.color_orders / summary.total_orders) * 100}%`,
                      background: "linear-gradient(90deg, #8b5cf6, #a78bfa)"
                    }} />
                  </div>
                  <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#64748b" }} />B&W: {summary.bw_orders}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#8b5cf6" }} />Color: {summary.color_orders}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#10b981" }} />Delivered: {summary.delivered}</span>
                  </div>
                </div>
              )}

              {/* Order table */}
              {orders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    Order Details
                  </h4>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {/* Table header */}
                    <div className="grid grid-cols-5 px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "var(--bg-muted)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      <span>ID</span>
                      <span>Status</span>
                      <span>Type</span>
                      <span>Copies</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {/* Rows */}
                    <div className="max-h-52 overflow-y-auto divide-y" style={{ divideColor: "var(--border)" } as React.CSSProperties}>
                      {orders.map((o) => (
                        <div key={o.id} className="grid grid-cols-5 px-3 py-2.5 text-xs items-center hover:bg-gray-50 transition-colors">
                          <span className="font-extrabold" style={{ color: "var(--accent)" }}>#{o.short_id}</span>
                          <span className="font-semibold capitalize px-1.5 py-0.5 rounded-full text-xs w-fit"
                            style={{ background: (STATUS_COLOR[o.status] || "#64748b") + "15", color: STATUS_COLOR[o.status] || "#64748b" }}>
                            {o.status.toLowerCase()}
                          </span>
                          <span style={{ color: "var(--text-second)" }}>{o.color_mode === "color" ? "🎨 Color" : "⚫ B&W"}</span>
                          <span style={{ color: "var(--text-second)" }}>{o.copies}</span>
                          <span className="text-right font-bold" style={{ color: "var(--green)" }}>₹{Number(o.total_amount).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {orders.length === 0 && (
                <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders in this date range</p>
                </div>
              )}

              {/* Export button */}
              {orders.length > 0 && (
                <button onClick={downloadCSV} disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ background: "var(--green-light)", border: "1px solid #6ee7b7", color: "var(--green)" }}>
                  {downloading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />Preparing CSV...</>
                    : <><Download className="w-4 h-4" />Export {summary.total_orders} Orders to CSV</>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 text-xs flex-shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-muted)", color: "var(--text-muted)" }}>
          💡 CSV exports open directly in Excel or Google Sheets.
        </div>
      </div>
    </div>
  );
}
