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
    // Email OTP verification (signup confirmation, magic links, password
    // recovery via the modern token_hash flow). Scanner-immune and
    // device-agnostic — works even if the email is opened on a different
    // device than the one that requested it.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
    console.error("[auth/callback] verifyOtp failed:", error.message, {
      type,
    });
  } else if (code) {
    // PKCE code exchange (legacy password reset, OAuth). Note: PKCE
    // requires the same browser session that initiated the request, so
    // cross-device clicks fail here. We keep this branch for backward
    // compatibility with older reset emails still in users' inboxes.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  } else {
    console.error("[auth/callback] no token_hash or code in callback URL");
  }

  // If verification failed, redirect to a friendly page that explains why.
  // For the password recovery flow specifically, send users to the reset
  // page where the "missing session" branch already shows good guidance.
  if (type === "recovery" || next === "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(errorUrl);
}
