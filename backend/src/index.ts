import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { startWhatsAppClient } from './whatsapp/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`PrintOS Backend running on port ${PORT}`);
});

// Start WhatsApp Client (Only if configured)
if (process.env.WHATSAPP_ENABLED === 'true') {
  startWhatsAppClient();
} else {
  console.log("WhatsApp client disabled. Set WHATSAPP_ENABLED=true to start.");
}
