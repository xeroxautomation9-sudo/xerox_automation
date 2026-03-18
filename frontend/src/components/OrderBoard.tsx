"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Printer, CheckCircle2, Clock, Package, FileText,
  ChevronRight, Layers, IndianRupee
} from "lucide-react";

export type Order = {
  id: string;
  short_id: string;
  status: "RECEIVED" | "PROCESSING" | "PRINTED" | "READY" | "DELIVERED";
  color_mode: string;
  copies: number;
  duplex: boolean;
  binding: string;
  urgency: string;
  total_amount: number;
  created_at: string;
  order_files: { file_name: string; pages: number }[];
};

const COLUMNS = [
  {
    id: "RECEIVED",
    label: "Received",
    icon: Clock,
    dot: "#3b7ef8",
    badgeClass: "badge-received",
    headerStyle: { background: "#f0f6ff", borderBottom: "2px solid #bdd1fd" },
  },
  {
    id: "PROCESSING",
    label: "Processing",
    icon: Printer,
    dot: "#f59e0b",
    badgeClass: "badge-processing",
    headerStyle: { background: "#fffdf0", borderBottom: "2px solid #fcd34d" },
  },
  {
    id: "PRINTED",
    label: "Printed",
    icon: FileText,
    dot: "#8b5cf6",
    badgeClass: "badge-printed",
    headerStyle: { background: "#faf8ff", borderBottom: "2px solid #c4b5fd" },
  },
  {
    id: "READY",
    label: "Ready",
    icon: CheckCircle2,
    dot: "#10b981",
    badgeClass: "badge-ready",
    headerStyle: { background: "#f0fdf8", borderBottom: "2px solid #6ee7b7" },
  },
  {
    id: "DELIVERED",
    label: "Delivered",
    icon: Package,
    dot: "#94a3b8",
    badgeClass: "badge-delivered",
    headerStyle: { background: "#f8fafc", borderBottom: "2px solid #cbd5e1" },
  },
];

function OrderCard({ order, colId, onUpdate }: { order: Order; colId: string; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const isUrgent = order.urgency === "urgent";
  const file = order.order_files?.[0]?.file_name || "No File";

  async function advance(newStatus: string) {
    setUpdating(true);
    await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    onUpdate();
    setUpdating(false);
  }

  return (
    <div
      className="card fade-up overflow-hidden cursor-pointer"
      style={{ borderRadius: "12px" }}
    >
      {/* Urgent stripe */}
      {isUrgent && (
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #f59e0b)" }} />
      )}

      <div className="p-4 space-y-3">
        {/* Top */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold tracking-wide" style={{ color: "var(--text-primary)" }}>
              #{order.short_id}
            </span>
            {isUrgent && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--red-light)", color: "var(--red)", border: "1px solid #fca5a5" }}
              >
                URGENT
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-0.5 text-sm font-extrabold flex-shrink-0"
            style={{ color: "var(--green)" }}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            {Number(order.total_amount).toFixed(0)}
          </div>
        </div>

        {/* File name */}
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs truncate" style={{ color: "var(--text-second)" }}>{file}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${order.color_mode === "color" ? "badge-printed" : "badge-delivered"}`}>
            {order.color_mode === "color" ? "🎨 Color" : "⚫ B&W"}
          </span>
          <span className="badge-received text-xs px-2 py-0.5 rounded-full font-semibold">
            <Layers className="inline w-3 h-3 mr-1" />
            {order.copies} {order.copies > 1 ? "copies" : "copy"}
          </span>
          {order.duplex && (
            <span className="badge-processing text-xs px-2 py-0.5 rounded-full font-semibold">2-sided</span>
          )}
          {order.binding && order.binding !== "none" && (
            <span className="badge-ready text-xs px-2 py-0.5 rounded-full font-semibold">Binding</span>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2 gap-2 flex-wrap"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }} suppressHydrationWarning>
            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" · "}
            {new Date(order.created_at).toLocaleDateString([], { day: "numeric", month: "short" })}
          </span>
          <div className="flex gap-2">
            {colId === "RECEIVED" && (
              <button
                onClick={() => advance("PROCESSING")}
                disabled={updating}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--orange-light)", color: "var(--orange)", border: "1px solid #fcd34d" }}
              >
                {updating ? "..." : <><Printer className="w-3.5 h-3.5" />Process</>}
              </button>
            )}
            {colId === "PRINTED" && (
              <button
                onClick={() => advance("READY")}
                disabled={updating}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid #6ee7b7" }}
              >
                {updating ? "..." : <><CheckCircle2 className="w-3.5 h-3.5" />Ready</>}
              </button>
            )}
            {colId === "READY" && (
              <button
                onClick={() => advance("DELIVERED")}
                disabled={updating}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid #bdd1fd" }}
              >
                {updating ? "..." : <><ChevronRight className="w-3.5 h-3.5" />Deliver</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCol, setActiveCol] = useState<string | null>(null); // mobile column selector
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID;

  useEffect(() => {
    if (!shopId) return;
    fetchOrders();
    const ch = supabase
      .channel("order-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function fetchOrders() {
    if (!shopId) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_files(file_name, pages)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  const totalRevenue = orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + Number(o.total_amount), 0);
  const active = orders.filter((o) => o.status !== "DELIVERED").length;

  /* ── Mobile: only show one column at a time ── */
  const currentMobileCol = activeCol ?? COLUMNS[0].id;

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Stats bar ── */}
      <div
        className="flex-shrink-0 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 sm:px-6 py-2.5"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
      >
        {[
          { label: "Active Jobs", value: active, color: "var(--accent)", bg: "var(--accent-light)", border: "#bdd1fd" },
          { label: "Revenue Today", value: `₹${totalRevenue.toFixed(0)}`, color: "var(--green)", bg: "var(--green-light)", border: "#6ee7b7" },
          { label: "Total Orders", value: orders.length, color: "var(--text-primary)", bg: "var(--bg-muted)", border: "var(--border-dark)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{s.label}</span>
            <span
              className="text-xs font-extrabold px-2 py-0.5 rounded-lg"
              style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Mobile column tabs ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 overflow-x-auto sm:hidden"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
      >
        {COLUMNS.map((col) => {
          const count = orders.filter((o) => o.status === col.id).length;
          const isActive = currentMobileCol === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveCol(col.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: isActive ? col.dot + "18" : "var(--bg-muted)",
                color: isActive ? col.dot : "var(--text-second)",
                border: `1px solid ${isActive ? col.dot + "44" : "var(--border)"}`,
              }}
            >
              {col.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-extrabold"
                  style={{ background: isActive ? col.dot : "var(--border-dark)", color: isActive ? "white" : "var(--text-second)" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP: Kanban columns ── */}
      <div className="hidden sm:flex flex-1 overflow-x-auto">
        <div className="flex h-full gap-4 p-4 sm:p-5" style={{ minWidth: `${COLUMNS.length * 270}px`, width: "100%" }}>
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.id);
            const Icon = col.icon;
            return (
              <div
                key={col.id}
                className="flex flex-col flex-1 min-w-[250px] overflow-hidden rounded-2xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3" style={col.headerStyle}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.dot, boxShadow: `0 0 6px ${col.dot}80` }} />
                    <Icon className="w-4 h-4" style={{ color: col.dot }} />
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{col.label}</span>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${col.badgeClass}`}>
                    {colOrders.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: "var(--bg-base)" }}>
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30">
                      <Icon className="w-7 h-7 mb-2" style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Empty</span>
                    </div>
                  ) : (
                    colOrders.map((o) => <OrderCard key={o.id} order={o} colId={col.id} onUpdate={fetchOrders} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MOBILE: Single column view ── */}
      <div className="flex flex-col flex-1 overflow-hidden sm:hidden">
        {(() => {
          const col = COLUMNS.find((c) => c.id === currentMobileCol)!;
          const colOrders = orders.filter((o) => o.status === col.id);
          const Icon = col.icon;
          return (
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: "var(--bg-base)" }}>
              {colOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <Icon className="w-10 h-10 mb-3" style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No orders here</span>
                </div>
              ) : (
                colOrders.map((o) => <OrderCard key={o.id} order={o} colId={col.id} onUpdate={fetchOrders} />)
              )}
            </div>
          );
        })()}
      </div>

    </div>
  );
}
