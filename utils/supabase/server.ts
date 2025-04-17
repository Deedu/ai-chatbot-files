import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name, value, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({
              name,
              value,
              ...options,
            });
          } catch (error) {
            // This can fail in Server Components because cookies are readonly
            console.error("Failed to set cookie:", error);
          }
        },
        async remove(name, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.delete({
              name,
              ...options,
            });
          } catch (error) {
            // This can fail in Server Components because cookies are readonly
            console.error("Failed to delete cookie:", error);
          }
        },
      },
    }
  );
}
