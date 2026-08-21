import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

type BrowserClient = ReturnType<typeof createBrowserClient>;

const globalForSupabase = globalThis as unknown as {
  supabaseBrowser: BrowserClient | undefined;
};

/** One browser client per tab — avoids extra Realtime sockets. */
export function createClient() {
  if (!globalForSupabase.supabaseBrowser) {
    globalForSupabase.supabaseBrowser = createBrowserClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
    );
  }
  return globalForSupabase.supabaseBrowser;
}
