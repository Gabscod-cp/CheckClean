import { createClient } from "@supabase/supabase-js";

// Liga o app no seu banco Supabase usando as duas variáveis do .env.local
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
