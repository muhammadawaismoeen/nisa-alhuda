/**
 * Centralised offering query functions.
 *
 * Single source of truth for how offerings are fetched — consistent select
 * shape and ordering across admin and student views.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Offering } from "@/lib/types/database";

const OFFERING_SELECT =
  "id, title, description, fee_type, price, price_inr, price_usd, " +
  "currency, schedule, is_published, created_at, updated_at";

/** Fetch all published offerings (student-facing, uses user client + RLS). */
export async function getPublishedOfferings(): Promise<Offering[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offerings")
    .select(OFFERING_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Offering[];
}

/** Fetch all offerings regardless of published state (admin view). */
export async function getAllOfferings(): Promise<Offering[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select(OFFERING_SELECT)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Offering[];
}

/** Fetch a single offering by ID. Returns null if not found. */
export async function getOfferingById(
  offeringId: string
): Promise<Offering | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select(OFFERING_SELECT)
    .eq("id", offeringId)
    .single<Offering>();

  return data ?? null;
}

/** Fetch only published offerings for a given week's schedule window. */
export async function getOfferingsWithSchedule(): Promise<Offering[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select(OFFERING_SELECT)
    .eq("is_published", true)
    .not("schedule", "is", null)
    .order("title");

  return (data ?? []) as unknown as Offering[];
}
