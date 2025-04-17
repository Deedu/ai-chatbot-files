import { createClient } from "./supabase/server";

/**
 * Helper function to verify authentication and handle 401 errors
 * Returns the authenticated user or throws a 401 error
 */
export async function verifyAuth() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth verification error:", error);
      throw new Response("Unauthorized", { status: 401 });
    }

    if (!user) {
      console.warn("Auth verification: No user found");
      throw new Response("Unauthorized", { status: 401 });
    }

    return user;
  } catch (err) {
    console.error("Auth verification exception:", err);
    throw new Response("Unauthorized", { status: 401 });
  }
}
