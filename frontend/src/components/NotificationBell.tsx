"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Clock, CheckCircle2, Package, Printer, FileText } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || "";

interface RecentOrder {
  id: string;
  short_id: string;
  status: string;
  created_at: string;
  total_amount: number;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  RECEIVED: Clock,
  PROCESSING: Printer,
  PRINTED: FileText,
  READY: CheckCircle2,
  DELIVERED: Package,
};
const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#3b7ef8",
  PROCESSING: "#f59e0b",
  PRINTED: "#8b5cf6",
  READY: "#10b981",
  DELIVERED: "#64748b",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecent();
    const t = setInterval(fetchRecent, 10_000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function fetchRecent() {
    if (!SHOP_ID) return;
    try {
      const res = await fetch(`${BACKEND}/api/orders/recent/${SHOP_ID}`, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const newOrders: RecentOrder[] = data.orders || [];
      setOrders(newOrders);
      // Count orders from last 5 minutes as unread
      const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
      setUnread(newOrders.filter((o) => new Date(o.created_at).getTime() > fiveMinsAgo).length);
    } catch { /* backend offline */ }
  }

  function handleOpen() {
    setOpen(!open);
    if (!open) setUnread(0); // mark as read when opened
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all"
        style={{ border: "1px solid var(--border)", color: "var(--text-second)", background: open ? "var(--bg-hover)" : "var(--bg-surface)" }}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-xs font-black"
            style={{ background: "var(--red)", fontSize: "9px" }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50 fade-up"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Recent Orders</span>
            <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg" style={{ color: "var(--text-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Order list */}
          <div className="max-h-80 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="py-10 text-center" style={{ color: "var(--text-muted)" }}>
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent orders</p>
              </div>
            ) : (
              orders.map((order) => {
                const Icon = STATUS_ICONS[order.status] || Clock;
                const color = STATUS_COLORS[order.status] || "#64748b";
                const isNew = Date.now() - new Date(order.created_at).getTime() < 5 * 60 * 1000;
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={{ borderBottom: "1px solid var(--border)", background: isNew ? "var(--accent-light)" : "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isNew ? "var(--accent-light)" : "transparent")}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: color + "18", border: `1px solid ${color}44` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>#{order.short_id}</span>
                        {isNew && <span className="text-xs font-bold px-1.5 rounded-full" style={{ background: "var(--accent)", color: "white" }}>NEW</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold capitalize" style={{ color }}>{order.status.toLowerCase()}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>· ₹{Number(order.total_amount).toFixed(0)}</span>
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(order.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>

          {orders.length > 0 && (
            <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-muted)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Showing last {orders.length} orders</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
