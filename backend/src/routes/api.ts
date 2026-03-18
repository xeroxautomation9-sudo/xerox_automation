import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase';
import { whatsappState } from '../whatsapp/client';

export const apiRouter = Router();

// Multer: store file in memory for Supabase upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── Walk-in Order Creation ─────────────────────────────────────
apiRouter.post('/orders/walkin', upload.single('file'), async (req, res) => {
  try {
    const {
      shop_id, customer_name, customer_phone,
      color_mode = 'bw', copies = '1', duplex = 'false',
      binding = 'none', urgency = 'normal', page_range = 'all',
    } = req.body;

    if (!shop_id) return res.status(400).json({ error: 'shop_id is required' });

    // Fetch shop pricing
    const { data: settings } = await supabase
      .from('shop_settings').select('*').eq('shop_id', shop_id).single();

    const pricePerPage = color_mode === 'color'
      ? (settings?.color_price || 10)
      : (settings?.bw_price || 2);
    const numCopies = parseInt(copies) || 1;
    let subtotal = pricePerPage * numCopies;
    if (binding !== 'none') subtotal += (settings?.binding_price || 20);
    if (urgency === 'urgent') subtotal += (settings?.urgent_fee || 50);

    // Upsert customer if phone provided
    let customerId: string | null = null;
    if (customer_phone?.trim()) {
      const { data: existing } = await supabase
        .from('customers').select('id').eq('shop_id', shop_id).eq('phone', customer_phone).single();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({ shop_id, phone: customer_phone, name: customer_name || 'Walk-in' })
          .select('id').single();
        customerId = newCust?.id ?? null;
      }
    }

    // Generate short ID
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        shop_id, customer_id: customerId, short_id: shortId,
        status: 'RECEIVED', color_mode, copies: numCopies,
        page_range, duplex: duplex === 'true',
        binding, urgency, subtotal, total_amount: subtotal,
      })
      .select('id').single();

    if (orderErr || !order) {
      return res.status(500).json({ error: orderErr?.message || 'Failed to create order' });
    }

    // Upload file if provided
    let fileUrl: string | null = null;
    let fileName = 'no-file';
    if (req.file) {
      fileName = req.file.originalname;
      const storagePath = `${shop_id}/${order.id}/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('print_files')
        .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('print_files').getPublicUrl(storagePath);
        fileUrl = urlData?.publicUrl ?? null;
      }

      await supabase.from('order_files').insert({
        order_id: order.id, file_url: fileUrl,
        file_name: fileName, file_type: req.file.mimetype, pages: 1,
      });
    }

    res.json({ success: true, order_id: order.id, short_id: shortId, total: subtotal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recent orders for notifications ───────────────────────────
apiRouter.get('/orders/recent/:shopId', async (req, res) => {
  const { data } = await supabase
    .from('orders')
    .select('id, short_id, status, created_at, total_amount')
    .eq('shop_id', req.params.shopId)
    .order('created_at', { ascending: false })
    .limit(8);
  res.json({ orders: data || [] });
});

// ── WhatsApp Status & QR endpoints (used by dashboard) ──────────

// Returns current connection state + phone number
apiRouter.get('/whatsapp/status', (req, res) => {
  res.json({
    connected: whatsappState.connected,
    phone: whatsappState.phone,
    hasQr: !!whatsappState.qrDataUrl,
  });
});

// Returns QR as base64 PNG data URL — poll every 3s from frontend
apiRouter.get('/whatsapp/qr', (req, res) => {
  if (whatsappState.connected) {
    return res.json({ connected: true, qr: null });
  }
  if (!whatsappState.qrDataUrl) {
    return res.json({ connected: false, qr: null, message: 'QR not ready yet, WhatsApp initializing...' });
  }
  res.json({ connected: false, qr: whatsappState.qrDataUrl });
});

apiRouter.get('/hello', (req, res) => {
  res.json({ message: 'PrintOS Backend API Online' });
});

// Print Agent API endpoints
apiRouter.get('/print-jobs/:shopId', async (req, res) => {
  const { shopId } = req.params;
  
  // Find orders that are 'RECEIVED' or 'PROCESSING'
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      short_id,
      status,
      color_mode,
      copies,
      page_range,
      duplex,
      binding,
      order_files(file_url, file_name, file_type)
    `)
    .eq('shop_id', shopId)
    .in('status', ['RECEIVED', 'PROCESSING'])
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ jobs: orders });
});

apiRouter.post('/print-jobs/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: status })
    .eq('id', jobId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

export default apiRouter;

// ── Reports API ────────────────────────────────────────────────
// GET /api/reports/:shopId?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|json
apiRouter.get('/reports/:shopId', async (req, res) => {
  const { shopId } = req.params;
  const { from, to, format } = req.query as { from?: string; to?: string; format?: string };

  let query = supabase
    .from('orders')
    .select(`
      id, short_id, status, color_mode, copies, duplex, binding,
      urgency, subtotal, total_amount, created_at, updated_at,
      customers(name, phone),
      order_files(file_name, pages)
    `)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  // Date filters — inclusive. 'to' gets end-of-day by appending T23:59:59
  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
  if (to)   query = query.lte('created_at', `${to}T23:59:59.999Z`);

  const { data: orders, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  if (!orders) return res.json({ orders: [], summary: {} });

  // ── Summary aggregation ───────────────────────────────────
  const summary = {
    total_orders:    orders.length,
    total_revenue:   orders.reduce((s, o) => s + Number(o.total_amount), 0),
    bw_orders:       orders.filter((o) => o.color_mode === 'bw').length,
    color_orders:    orders.filter((o) => o.color_mode === 'color').length,
    delivered:       orders.filter((o) => o.status === 'DELIVERED').length,
    pending:         orders.filter((o) => !['DELIVERED','PRINTED'].includes(o.status)).length,
    urgent_orders:   orders.filter((o) => o.urgency === 'urgent').length,
    avg_order_value: orders.length ? (orders.reduce((s, o) => s + Number(o.total_amount), 0) / orders.length) : 0,
  };

  // ── CSV export ────────────────────────────────────────────
  if (format === 'csv') {
    const headers = ['Order ID','Short ID','Status','Color','Copies','Duplex','Binding','Urgency','Total (₹)','Customer Name','Customer Phone','File Name','Date'];
    const rows = orders.map((o: any) => [
      o.id,
      o.short_id,
      o.status,
      o.color_mode.toUpperCase(),
      o.copies,
      o.duplex ? 'Yes' : 'No',
      o.binding,
      o.urgency,
      Number(o.total_amount).toFixed(2),
      o.customers?.name ?? 'Walk-in',
      o.customers?.phone ?? '-',
      o.order_files?.[0]?.file_name ?? '-',
      new Date(o.created_at).toLocaleString('en-IN'),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="PrintOS_Report_${from || 'all'}_to_${to || 'now'}.csv"`);
    return res.send(csv);
  }

  res.json({ orders, summary });
});
