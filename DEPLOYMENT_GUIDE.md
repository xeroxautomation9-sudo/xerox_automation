# 🚀 PrintOS Deployment Guide

The code is now absolutely clean, fully functional, and ready for production deployment. There are three components to deploy: the **Frontend** (Next.js), the **Backend** (Node.js API + WhatsApp), and the **Local Print Agent** (Node.js).

---

## 🏗️ 1. Deploy the Backend (Railway or Render)

The backend handles the API, Supabase communication, and running the WhatsApp client. A VPS or a service like Railway/Render is best. 

**Steps for Railway:**
1. Push your `backend` folder to a new GitHub repository.
2. Go to [Railway.app](https://railway.app) and create a New Project from the GitHub repo.
3. In Railway settings, add the following Environment Variables exactly as they are in your `.env`:
   - `PORT=4000`
   - `SUPABASE_URL=https://swmxckkzqehqcdcokkrz.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=...(your service key)...`
   - `GROQ_API_KEY=...(your groq key)...`
   - `WHATSAPP_ENABLED=true`
   - `SHOP_ID=6775f839-57e5-4f79-843c-2fe1a74e4ac4`
4. Deploy! Railway will automatically detect `npm run start` and start the server. 
5. Next, open your deployed Railway app URL — e.g., `https://my-backend.up.railway.app`.

---

## 🎨 2. Deploy the Frontend (Vercel)

The frontend is a Next.js 14 app, so Vercel is the easiest and most optimized place to host it.

**Steps for Vercel:**
1. Push your `frontend` folder to a GitHub repository (can be the same repo, just specify the `frontend` root directory).
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Add the following Environment Variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL=https://swmxckkzqehqcdcokkrz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...(your anon key)...`
   - `NEXT_PUBLIC_SHOP_ID=6775f839-57e5-4f79-843c-2fe1a74e4ac4`
   - `NEXT_PUBLIC_BACKEND_URL=https://my-backend.up.railway.app` *(⚠️ Important: Use your real deployed backend URL here!)*
4. Click **Deploy**. Vercel will build and host your dashboard instantly!

---

## 🖨️ 3. Run the Local Print Agent

The Print Agent **must** run on the Windows PC that is physically connected to your wired printer. It cannot run in the cloud.

1. On your Windows shop computer, open the `local-print-agent` folder.
2. Edit the `.env` file and set `BACKEND_API_URL` to your new deployed backend URL (`https://my-backend.up.railway.app`).
3. Set `PRINTER_NAME="your printer name"` and `SHOP_ID=6775f839-57e5-4f79-843c-2fe1a74e4ac4`.
4. Run `npm install` and then `npm start`.
5. Keep this terminal open! (You can use a tool like PM2 to keep it running in the background automatically when the PC starts).

---

### 🎉 You're Done!
Once deployed:
1. Go to your Vercel frontend URL.
2. Click **WhatsApp** and scan the QR code to connect your business number.
3. Click **Set Printer** and verify your Windows printer says "Online".

Your automated print shop is now officially live! 🚀
