import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * API endpoint to reset auth cookies when a user experiences 401 errors
 * This can help recover from broken authentication states
 */
export async function GET() {
  const cookieStore = await cookies();

  // List of Supabase auth cookies to reset
  const authCookies = [
    "sb-access-token",
    "sb-refresh-token",
    "supabase-auth-token",
    "__session",
  ];

  // Clear each auth cookie
  for (const name of authCookies) {
    cookieStore.delete(name);
  }

  return NextResponse.json(
    { success: true, message: "Auth cookies cleared" },
    { status: 200 }
  );
}
