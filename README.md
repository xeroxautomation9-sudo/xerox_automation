# PrintOS - WhatsApp Print Shop Operating System

A robust, production-ready SaaS Print Shop Management system that automates file collection, pricing via AI, print queueing, and local printing.

## Architecture

1. **Frontend**: Next.js 14 App Router, TailwindCSS (for Shop Owners)
2. **Backend**: Express + WhatsApp-Web.js + Groq SDK (WhatsApp Bot + Backend APIs)
3. **Local Print Agent**: Node.js Local Polling Service built to work with Windows Spooler (`pdf-to-printer`)
4. **Database & Storage**: Supabase PostgreSQL & Storage

## Setup Guide

### 1. Database Setup
1. Go to [Supabase](https://supabase.com), create a project.
2. Run the SQL located in `supabase/schema.sql` in the Supabase SQL Editor to construct tables and RLS policies.
3. Turn on Realtime for `orders` table.
4. Create a public storage bucket named `print_files`.
5. Get your Supabase Project URL, Service Role Key, and Anon Key.

### 2. Backend Environment
1. In `backend/`, copy `.env.example` to `.env` and configure:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required to bypass RLS in the background)
   - `GROQ_API_KEY` (From [Groq Cloud](https://console.groq.com/))
   - `WHATSAPP_ENABLED=true`
   - `SHOP_ID` (Get a Shop UUID after creating a Shop in Supabase)
2. Start the Backend:
   ```bash
   cd backend
   npm run dev
   ```
   *Note: On first startup with `WHATSAPP_ENABLED=true`, a QR code will print in terminal. Scan using WhatsApp Linked Devices.*

### 3. Frontend Environment (Dashboard)
1. In `frontend/`, copy `.env.local.example` to `.env.local` and substitute values.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SHOP_ID`
2. Start Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

### 4. Local Print Agent (Runs on Windows PC connected to Printer)
1. Install a PDF viewing/printing backend (if not present) normally relying on SumatraPDF on Windows. The module `pdf-to-printer` automatically ships with SumatraPDF, so it should work out of the box in Windows.
2. In `local-print-agent/`, copy `.env.example` to `.env` and set:
   - `BACKEND_API_URL` (Points to `http://localhost:4000/api` or your deployed Render URL)
   - `SHOP_ID`
   - `PRINTER_NAME` (Optional, defaults to Windows Default Printer if omitted)
3. Start the Print Agent:
   ```bash
   cd local-print-agent
   npm run start
   ```

## Workflow Explanation
1. User messages your shop's WhatsApp number.
2. If no session exists, it asks for a File.
3. User sends PDF. System uploads to Supabase.
4. System asks for requirements (copies, color, duplex).
5. Groq AI parses the user string into JSON. System responds with total cost calculation based on `shop_settings`.
6. User replies `YES`. Order is generated and emitted over Realtime WS.
7. Frontend Dashboard auto-updates, showing the order.
8. Local Print Agent polls the backend, sees a `PROCESSING` or `RECEIVED` job.
9. Agent downloads the file from Supabase and pushes it to Windows Spooler.
10. Order is tracked as `PRINTED`.
