-- Supabase PostgreSQL Schema for PrintOS

-- Enable uuid extension (required for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE order_status AS ENUM ('WAITING_REQUIREMENTS', 'RECEIVED', 'PROCESSING', 'PRINTED', 'READY', 'DELIVERED');
CREATE TYPE whatsapp_state AS ENUM ('WAIT_FILE', 'WAIT_REQUIREMENTS', 'WAIT_CONFIRMATION', 'ORDER_CREATED');

-- TABLES
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protect shops so only owner can access
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view and edit their own shop." ON shops FOR ALL USING (auth.uid() = user_id);

CREATE TABLE shop_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  bw_price NUMERIC(10,2) DEFAULT 2.00,
  color_price NUMERIC(10,2) DEFAULT 10.00,
  binding_price NUMERIC(10,2) DEFAULT 20.00,
  urgent_fee NUMERIC(10,2) DEFAULT 50.00,
  working_hours TEXT DEFAULT '09:00-18:00',
  printer_name TEXT DEFAULT 'Microsoft Print to PDF',
  auto_reply_message TEXT DEFAULT 'Welcome to our Print Shop! Please send your document to get started.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  total_orders INT DEFAULT 0,
  total_spend NUMERIC(10,2) DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  state whatsapp_state DEFAULT 'WAIT_FILE',
  context JSONB DEFAULT '{}', -- Store temporary order info (files, copies, etc)
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL, -- Short human readable ID
  status order_status DEFAULT 'RECEIVED',
  color_mode TEXT DEFAULT 'bw',
  copies INT DEFAULT 1,
  page_range TEXT DEFAULT 'all',
  duplex BOOLEAN DEFAULT false,
  binding TEXT DEFAULT 'none',
  urgency TEXT DEFAULT 'normal',
  pickup_time TIMESTAMP WITH TIME ZONE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, short_id)  -- prevent duplicate short IDs per shop
);

CREATE TABLE order_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  pages INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_url TEXT,
  status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS FOR ALL TABLES
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can access their settings" ON shop_settings FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);
CREATE POLICY "Shop owners can access their customers" ON customers FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);
CREATE POLICY "Shop owners can access their sessions" ON whatsapp_sessions FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);
CREATE POLICY "Shop owners can access their orders" ON orders FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);
CREATE POLICY "Shop owners can access their order files" ON order_files FOR ALL USING (
  order_id IN (SELECT id FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid()))
);
CREATE POLICY "Shop owners can access their billing" ON billing FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);

-- Setup realtime on orders table
alter publication supabase_realtime add table orders;

-- ============================================
-- RPC: increment_customer_stats
-- Called when an order is confirmed. Updates
-- total_orders, total_spend, and last_visit.
-- ============================================
CREATE OR REPLACE FUNCTION increment_customer_stats(
  p_shop_id UUID,
  p_phone TEXT,
  p_spend NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE customers
  SET
    total_orders = total_orders + 1,
    total_spend  = total_spend + p_spend,
    last_visit   = NOW()
  WHERE shop_id = p_shop_id
    AND phone   = p_phone;
END;
$$;
