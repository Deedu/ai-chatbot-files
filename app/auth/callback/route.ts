import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error.message)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=AuthenticationError`)
      }
    } catch (err) {
      console.error('Exception in auth callback:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=ServerError`)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
} 