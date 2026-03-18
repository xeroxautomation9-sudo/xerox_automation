import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { handleIncomingMessage } from './handler';

// ── In-memory state (shared with API routes) ──────────────────
export const whatsappState = {
  connected: false,
  qrDataUrl: null as string | null,   // base64 PNG for the dashboard
  qrRaw: null as string | null,       // raw string for terminal fallback
  phone: null as string | null,       // connected phone number
};

// ── WhatsApp Client ───────────────────────────────────────────
export const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

whatsappClient.on('qr', async (qr) => {
  console.log('SCAN THIS QR CODE TO LINK WHATSAPP:');
  qrcodeTerminal.generate(qr, { small: true }); // still print to terminal

  // Convert to base64 PNG for the frontend dashboard
  try {
    whatsappState.qrDataUrl = await QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    whatsappState.qrRaw = qr;
    whatsappState.connected = false;
    console.log('QR ready for dashboard at /api/whatsapp/qr');
  } catch (err) {
    console.error('Failed to generate QR PNG:', err);
  }
});

whatsappClient.on('ready', async () => {
  console.log('WhatsApp Client is ready!');
  whatsappState.connected = true;
  whatsappState.qrDataUrl = null;
  whatsappState.qrRaw = null;
  try {
    const info = whatsappClient.info;
    whatsappState.phone = info?.wid?.user ?? null;
    console.log(`Connected as: ${whatsappState.phone}`);
  } catch {
    whatsappState.phone = null;
  }
});

whatsappClient.on('disconnected', (reason) => {
  console.log('WhatsApp disconnected:', reason);
  whatsappState.connected = false;
  whatsappState.phone = null;
  // The client will auto-generate a new QR on next init
});

whatsappClient.on('auth_failure', (msg) => {
  console.error('WhatsApp auth failure:', msg);
  whatsappState.connected = false;
  whatsappState.qrDataUrl = null;
});

whatsappClient.on('message', async (message) => {
  if (message.from === 'status@broadcast') return;
  await handleIncomingMessage(message, whatsappClient);
});

export function startWhatsAppClient() {
  whatsappClient.initialize();
}
