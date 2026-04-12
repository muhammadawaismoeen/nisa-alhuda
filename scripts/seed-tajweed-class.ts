/**
 * Seed Script: Create "The Treasures of Tajweed" Class Offering
 *
 * Based on the poster details:
 * - Title: كنوز التجويد — The Treasures of Tajweed
 * - Instructor: Muallimah Hafizah Bint e Faisal
 * - Schedule: Starting June 23rd 2025, Monday & Thursday 5–5:40pm PKT
 * - Details: Limited Seats | Online | Females Only
 *
 * Usage: npx tsx scripts/seed-tajweed-class.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("=== Seeding Tajweed Class Offering ===\n");

  // 1. Find instructor: Hafizah Binte Faisal
  const { data: instructor } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", "%Hafizah%Faisal%")
    .single();

  if (!instructor) {
    console.error("Instructor 'Hafizah Binte Faisal' not found in profiles.");
    console.error("Run seed-instructors.ts first.");
    process.exit(1);
  }

  console.log(`Found instructor: ${instructor.full_name} (${instructor.id})`);

  // 2. Check if offering already exists
  const { data: existing } = await supabase
    .from("offerings")
    .select("id")
    .eq("slug", "treasures-of-tajweed")
    .single();

  if (existing) {
    console.log("Offering already exists. Updating...");
    const { error } = await supabase
      .from("offerings")
      .update({
        title: "كنوز التجويد — The Treasures of Tajweed",
        description: `Where every rule is a treasure. Every sound a secret.

Uncover the beauty of every Quranic letter in this comprehensive Tajweed class taught by Muallimah Hafizah Bint e Faisal.

Instructor Credentials:
• Wifaq Certified Hifz of Qur'an
• Alamiyyah Graduate
• Experienced Arabic Muallimah

Class Details:
• Schedule: Monday & Thursday, 5:00 – 5:40 PM PKT
• Mode: Online
• Limited Seats Available
• For Females Only

Register now and begin your journey to perfecting your Quranic recitation!`,
        short_description:
          "Where every rule is a treasure. Every sound a secret. Learn Tajweed with Muallimah Hafizah Bint e Faisal.",
        type: "class",
        price: 0,
        fee_type: "monthly",
        status: "published",
        instructor_id: instructor.id,
        schedule_start: "2025-06-23",
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Update failed:", error.message);
    } else {
      console.log("✓ Offering updated successfully!");
    }
  } else {
    // 3. Create new offering
    const { data, error } = await supabase
      .from("offerings")
      .insert({
        title: "كنوز التجويد — The Treasures of Tajweed",
        slug: "treasures-of-tajweed",
        description: `Where every rule is a treasure. Every sound a secret.

Uncover the beauty of every Quranic letter in this comprehensive Tajweed class taught by Muallimah Hafizah Bint e Faisal.

Instructor Credentials:
• Wifaq Certified Hifz of Qur'an
• Alamiyyah Graduate
• Experienced Arabic Muallimah

Class Details:
• Schedule: Monday & Thursday, 5:00 – 5:40 PM PKT
• Mode: Online
• Limited Seats Available
• For Females Only

Register now and begin your journey to perfecting your Quranic recitation!`,
        short_description:
          "Where every rule is a treasure. Every sound a secret. Learn Tajweed with Muallimah Hafizah Bint e Faisal.",
        type: "class",
        price: 0,
        fee_type: "monthly",
        status: "published",
        instructor_id: instructor.id,
        schedule_start: "2025-06-23",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }

    console.log(`✓ Offering created! ID: ${data.id}`);
  }

  console.log("\n=== Seed Complete! ===");
  console.log("\nThe Tajweed class is now published at: /offerings/treasures-of-tajweed");
}

seed().catch(console.error);
