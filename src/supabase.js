import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const mapUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.full_name || u.email.split("@")[0],
});
