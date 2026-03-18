"use client";

import { useState, useRef, useCallback } from "react";
import {
  X, Upload, FileText, User, Phone, Printer,
  Plus, Minus, CheckCircle2, Loader2, IndianRupee,
  AlertCircle, Zap
} from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || "";

// Pricing defaults (shown live; actual price computed by backend)
const PRICE = { bw: 2, color: 10, binding: 20, urgent: 50 };

interface FormState {
  customerName: string;
  customerPhone: string;
  colorMode: "bw" | "color";
  copies: number;
  duplex: boolean;
  binding: "none" | "spiral" | "tape";
  urgency: "normal" | "urgent";
  pageRange: string;
}

type SubmitStatus = "idle" | "uploading" | "success" | "error";

export default function NewOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [form, setForm] = useState<FormState>({
    customerName: "", customerPhone: "",
    colorMode: "bw", copies: 1, duplex: false,
    binding: "none", urgency: "normal", pageRange: "all",
  });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{ short_id: string; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live price calculation
  const livePrice = (() => {
    const base = (form.colorMode === "color" ? PRICE.color : PRICE.bw) * form.copies;
    const bind = form.binding !== "none" ? PRICE.binding : 0;
    const urgent = form.urgency === "urgent" ? PRICE.urgent : 0;
    return base + bind + urgent;
  })();

  const set = (key: keyof FormState, val: string | number | boolean) => setForm((f) => ({ ...f, [key]: val }));

  // File drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  async function submit() {
    if (!file) { setErrorMsg("Please attach a file."); return; }
    setStatus("uploading"); setErrorMsg("");

    const data = new FormData();
    data.append("file", file);
    data.append("shop_id", SHOP_ID);
    data.append("customer_name", form.customerName);
    data.append("customer_phone", form.customerPhone);
    data.append("color_mode", form.colorMode);
    data.append("copies", String(form.copies));
    data.append("duplex", String(form.duplex));
    data.append("binding", form.binding);
    data.append("urgency", form.urgency);
    data.append("page_range", form.pageRange);

    try {
      const res = await fetch(`${BACKEND}/api/orders/walkin`, { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server error");
      setSuccessData({ short_id: json.short_id, total: json.total });
      setStatus("success");
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  // ── Success Screen ──
  if (status === "success" && successData) {
    return (
      <div className="overlay flex items-center justify-center z-50">
        <div className="slide-in fade-up w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--green-light)" }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: "var(--green)" }} />
            </div>
            <div>
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Order Created!</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-second)" }}>Added to the print queue</p>
            </div>
            <div className="w-full rounded-xl p-4 space-y-2" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Tracking ID</span>
                <span className="font-extrabold" style={{ color: "var(--accent)" }}>#{successData.short_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Total Amount</span>
                <span className="font-extrabold flex items-center gap-1" style={{ color: "var(--green)" }}>
                  <IndianRupee className="w-3.5 h-3.5" />{successData.total.toFixed(0)}
                </span>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setStatus("idle"); setFile(null); setForm({ customerName: "", customerPhone: "", colorMode: "bw", copies: 1, duplex: false, binding: "none", urgency: "normal", pageRange: "all" }); setSuccessData(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text-second)" }}>
                New Order
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#3b7ef8,#6366f1)", boxShadow: "0 4px 12px rgba(59,126,248,0.3)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay flex items-end sm:items-center justify-center z-50">
      <div
        className="slide-in w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "95vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd" }}>
              <Printer className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>New Walk-in Order</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Create order for counter customer</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "var(--bg-muted)", color: "var(--text-second)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Customer Info ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Customer Info (optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="text" placeholder="Customer name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-base)", border: "1px solid var(--border-dark)", color: "var(--text-primary)" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"} onBlur={(e) => e.target.style.borderColor = "var(--border-dark)"} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="tel" placeholder="Phone number" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-base)", border: "1px solid var(--border-dark)", color: "var(--text-primary)" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"} onBlur={(e) => e.target.style.borderColor = "var(--border-dark)"} />
              </div>
            </div>
          </section>

          {/* ── File Upload ── */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>File to Print</h3>
            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all py-8"
              style={{ borderColor: dragging ? "var(--accent)" : file ? "#6ee7b7" : "var(--border-dark)", background: dragging ? "var(--accent-light)" : file ? "var(--green-light)" : "var(--bg-base)" }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <FileText className="w-8 h-8" style={{ color: "var(--green)" }} />
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "var(--green)" }}>{file.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {(file.size / 1024).toFixed(1)} KB · Click to replace
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Drop file or click to browse</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>PDF, DOCX, JPG, PNG · Max 50MB</p>
                  </div>
                </>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.pptx"
                onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            </div>
          </section>

          {/* ── Print Settings ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Print Settings</h3>

            {/* Color mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Color Mode</span>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dark)" }}>
                {(["bw", "color"] as const).map((m) => (
                  <button key={m} onClick={() => set("colorMode", m)}
                    className="px-4 py-2 text-sm font-bold transition-all"
                    style={{ background: form.colorMode === m ? (m === "color" ? "#f5f3ff" : "var(--bg-muted)") : "var(--bg-surface)", color: form.colorMode === m ? (m === "color" ? "var(--purple)" : "var(--text-primary)") : "var(--text-muted)" }}>
                    {m === "bw" ? "⚫ B&W" : "🎨 Color"}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Copies</span>
              <div className="flex items-center gap-3">
                <button onClick={() => set("copies", Math.max(1, form.copies - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: "var(--bg-muted)", border: "1px solid var(--border-dark)", color: "var(--text-second)" }}>
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-extrabold w-6 text-center" style={{ color: "var(--text-primary)" }}>{form.copies}</span>
                <button onClick={() => set("copies", Math.min(99, form.copies + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: "var(--accent-light)", border: "1px solid #bdd1fd", color: "var(--accent)" }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Duplex */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Double-sided</span>
              <button onClick={() => set("duplex", !form.duplex)}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: form.duplex ? "var(--accent)" : "var(--border-dark)" }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: form.duplex ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>

            {/* Binding */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Binding</span>
              <div className="flex gap-2">
                {(["none", "spiral", "tape"] as const).map((b) => (
                  <button key={b} onClick={() => set("binding", b)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
                    style={{ background: form.binding === b ? "var(--accent-light)" : "var(--bg-muted)", border: `1px solid ${form.binding === b ? "#bdd1fd" : "var(--border-dark)"}`, color: form.binding === b ? "var(--accent)" : "var(--text-second)" }}>
                    {b === "none" ? "None" : b === "spiral" ? "📎 Spiral" : "🖇️ Tape"}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-second)" }}>Priority</span>
              <div className="flex gap-2">
                {(["normal", "urgent"] as const).map((u) => (
                  <button key={u} onClick={() => set("urgency", u)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: form.urgency === u ? (u === "urgent" ? "var(--red-light)" : "var(--bg-muted)") : "var(--bg-surface)",
                      border: `1px solid ${form.urgency === u ? (u === "urgent" ? "#fca5a5" : "var(--border-dark)") : "var(--border)"}`,
                      color: form.urgency === u ? (u === "urgent" ? "var(--red)" : "var(--text-second)") : "var(--text-muted)"
                    }}>
                    {u === "urgent" ? <><Zap className="inline w-3.5 h-3.5 mr-1" />Urgent</> : "Normal"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Live Price ── */}
          <section className="rounded-xl p-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            <div className="space-y-2">
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{form.colorMode === "color" ? "Color" : "B&W"} × {form.copies} {form.copies > 1 ? "copies" : "copy"}</span>
                <span>₹{(form.colorMode === "color" ? PRICE.color : PRICE.bw) * form.copies}</span>
              </div>
              {form.binding !== "none" && (
                <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Binding ({form.binding})</span><span>₹{PRICE.binding}</span>
                </div>
              )}
              {form.urgency === "urgent" && (
                <div className="flex justify-between text-xs" style={{ color: "var(--red)" }}>
                  <span>Urgent fee</span><span>₹{PRICE.urgent}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold pt-2" style={{ borderTop: "1px solid var(--border)", color: "var(--text-primary)" }}>
                <span>Total</span>
                <span className="flex items-center gap-1" style={{ color: "var(--green)" }}>
                  <IndianRupee className="w-4 h-4" />{livePrice}
                </span>
              </div>
            </div>
          </section>

          {/* Error */}
          {(status === "error" || errorMsg) && (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "var(--red-light)", border: "1px solid #fca5a5" }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--red)" }} />
              <p className="text-xs" style={{ color: "var(--red)" }}>{errorMsg || "Something went wrong. Please try again."}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: "var(--bg-muted)", border: "1px solid var(--border-dark)", color: "var(--text-second)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={status === "uploading" || !file}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#3b7ef8,#6366f1)", boxShadow: "0 4px 12px rgba(59,126,248,0.3)" }}>
            {status === "uploading"
              ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              : <><CheckCircle2 className="w-4 h-4" />Create Order — ₹{livePrice}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
