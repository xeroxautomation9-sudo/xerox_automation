import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force dotenv to load from the explicit backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error("🚨 CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from backend/.env!");
} else {
  console.log("✅ Supabase service key loaded (length: " + supabaseKey.length + ")");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
