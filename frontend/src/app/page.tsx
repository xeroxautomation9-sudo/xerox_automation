"use client";

import { useEffect, useState } from "react";
import OrderBoard from "@/components/OrderBoard";
import PrinterSettingsPanel from "@/components/PrinterSettingsPanel";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import NewOrderModal from "@/components/NewOrderModal";
import NotificationBell from "@/components/NotificationBell";
import ReportsModal from "@/components/ReportsModal";
import {
  Printer, PlusCircle, Wifi, WifiOff,
  ChevronDown, Menu, X, MessageSquare, LayoutDashboard, Settings
} from "lucide-react";

/* ── Printer status badge (reads from localStorage) ── */
function PrinterBadge({ onClick }: { onClick: () => void }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const s = localStorage.getItem("printer_config");
      setName(s ? JSON.parse(s).name : null);
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: name ? "var(--green-light)" : "var(--red-light)",
        border: `1px solid ${name ? "#6ee7b7" : "#fca5a5"}`,
        color: name ? "var(--green)" : "var(--red)",
      }}
    >
      {name ? <Wifi className="w-4 h-4 flex-shrink-0" /> : <WifiOff className="w-4 h-4 flex-shrink-0" />}
      <span className="hidden sm:block truncate max-w-[130px]">{name || "Set Printer"}</span>
      <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0 hidden sm:block" />
    </button>
  );
}

export default function Home() {
  const [showPrinter, setShowPrinter] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [badgeKey, setBadgeKey] = useState(0);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);

  // Poll WhatsApp connection status for the header badge
  useEffect(() => {
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    async function checkWa() {
      try {
        const res = await fetch(`${BACKEND}/api/whatsapp/status`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        setWaConnected(data.connected);
      } catch {
        setWaConnected(false);
      }
    }
    checkWa();
    const t = setInterval(checkWa, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const update = () =>
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  function closePrinter() {
    setShowPrinter(false);
    setBadgeKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ════════════════════════ HEADER ════════════════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-16 z-30"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3b7ef8, #8b5cf6)", boxShadow: "0 4px 12px rgba(59,126,248,0.35)" }}
          >
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-base font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              Print<span style={{ color: "var(--accent)" }}>OS</span>
            </div>
            <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Shop Dashboard</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Queue", icon: LayoutDashboard, active: true, action: undefined },
            { label: "WhatsApp", icon: MessageSquare, active: false, action: () => setShowWhatsApp(true) },
            { label: "Reports", icon: Settings, active: false, action: () => setShowReports(true) },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: item.active ? "var(--accent-light)" : "transparent",
                color: item.active ? "var(--accent)" : "var(--text-second)",
                border: item.active ? "1px solid #bdd1fd" : "1px solid transparent",
              }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* WhatsApp live badge — clickable */}
          <button
            onClick={() => setShowWhatsApp(true)}
            className="hide-mobile flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: waConnected ? "var(--green-light)" : "var(--orange-light)",
              border: `1px solid ${waConnected ? "#6ee7b7" : "#fcd34d"}`,
              color: waConnected ? "var(--green)" : "var(--orange)",
            }}
          >
            <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: waConnected ? "var(--green)" : "var(--orange)" }} />
            {waConnected ? "WhatsApp Live" : "WhatsApp: Not linked"}
          </button>

          {/* Printer badge */}
          <PrinterBadge key={badgeKey} onClick={() => setShowPrinter(true)} />

          {/* Notification Bell */}
          <NotificationBell />

          {/* New Order */}
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #3b7ef8, #6366f1)",
              color: "white",
              boxShadow: "0 4px 12px rgba(59,126,248,0.35)",
            }}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:block">New Order</span>
          </button>

          {/* Mobile hamburger */}
          <button
            className="show-mobile-only w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ border: "1px solid var(--border)", color: "var(--text-second)" }}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenu && (
        <div
          className="show-mobile-only flex flex-col px-4 py-3 gap-1 z-20"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
        >
          {[
            { label: "Queue", action: () => setMobileMenu(false) },
            { label: "WhatsApp", action: () => { setShowWhatsApp(true); setMobileMenu(false); } },
            { label: "Reports", action: () => { setShowReports(true); setMobileMenu(false); } },
          ].map((item, i) => (
            <button
              key={item.label}
              className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: i === 0 ? "var(--accent-light)" : "transparent",
                color: i === 0 ? "var(--accent)" : "var(--text-second)",
              }}
              onClick={item.action}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════ SUBHEADER ════════════════════════ */}
      <div
        className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h1 className="text-sm sm:text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Active Order Queue
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Real-time sync with WhatsApp &amp; print agent{currentTime ? ` · ${currentTime}` : ""}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd", color: "var(--accent)" }}
        >
          <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          LIVE
        </span>
      </div>

      {/* ════════════════════════ MAIN BOARD ════════════════════════ */}
      <main className="flex-1 overflow-hidden">
        <OrderBoard />
      </main>

      {showPrinter && <PrinterSettingsPanel onClose={closePrinter} />}
      {showWhatsApp && <WhatsAppPanel onClose={() => setShowWhatsApp(false)} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
      {showReports && <ReportsModal onClose={() => setShowReports(false)} />}
    </div>
  );
}
