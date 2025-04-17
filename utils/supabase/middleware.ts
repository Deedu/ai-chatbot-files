import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  const { cookies } = request
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  await supabase.auth.getUser()
  
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
} 