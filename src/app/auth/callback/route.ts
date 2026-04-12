/**
 * Auth Callback Route Handler
 *
 * Handles two Supabase auth flows:
 *   1. PKCE code exchange — password reset & OAuth redirects send a `code` param
 *   2. Email OTP (token_hash) — signup confirmation & magic-link emails
 *
 * After exchanging the token/code for a valid session, redirects the user
 * to the `next` query param (defaults to /dashboard).
 */
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const redirectTo = new URL(next, request.url);

  const supabase = await createClient();

  if (token_hash && type) {
    // Email OTP verification (signup confirmation, magic links)
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  } else if (code) {
    // PKCE code exchange (password reset, OAuth)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // If verification failed, redirect to an error-friendly page
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(errorUrl);
}
