/**
 * Seed Script: Create Instructor Profiles + Update Program
 *
 * Creates all instructor accounts and updates the Sisterhood Islamic Studies
 * program with correct subject details and instructor assignments.
 *
 * Usage: npx tsx scripts/seed-instructors.ts
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

interface InstructorSeed {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

const instructors: InstructorSeed[] = [
  {
    email: "neelam.ijaz@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Muallimah Neelam Ijaz",
  },
  {
    email: "sana.ahmed@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Muallimah Sana Ahmed",
  },
  {
    email: "kareemunnisa@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Muallimah Kareemunnisa Shaik",
  },
  {
    email: "sana.areeba@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Muallimah Sana Areeba",
  },
  {
    email: "binte.ashfaque@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Ustadha Bint e Ashfaque",
  },
  {
    email: "binte.nisar@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Muallimah Binte Nisar",
  },
  {
    email: "hafizah.binte.faisal@nisaalhuda.com",
    password: "Instructor@123",
    full_name: "Hafizah Binte Faisal",
  },
];

async function createInstructor(
  data: InstructorSeed
): Promise<string | null> {
  const { data: authUser, error } =
    await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });

  let userId: string;

  if (error) {
    if (error.message.includes("already been registered")) {
      // Find existing
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find((u) => u.email === data.email);
      if (!existing) {
        console.error(`   Could not find existing user: ${data.email}`);
        return null;
      }
      userId = existing.id;
      console.log(`   Already exists: ${data.full_name} (${data.email})`);
    } else {
      console.error(`   Error creating ${data.email}:`, error.message);
      return null;
    }
  } else {
    userId = authUser.user.id;
    console.log(`   Created: ${data.full_name} (${data.email})`);
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({
      role: "instructor",
      full_name: data.full_name,
      ...(data.phone ? { phone: data.phone } : {}),
    })
    .eq("id", userId);

  return userId;
}

async function seed() {
  console.log("=== Seeding Instructor Profiles ===\n");

  // ─── Create All Instructors ───
  console.log("1. Creating instructor accounts...");
  const instructorIds: Record<string, string> = {};

  for (const inst of instructors) {
    const id = await createInstructor(inst);
    if (id) {
      instructorIds[inst.email] = id;
    }
  }

  console.log(`\n   Total instructors: ${Object.keys(instructorIds).length}`);

  // ─── Update Program Subjects ───
  console.log("\n2. Updating program subjects with correct instructors...");

  const { data: offering } = await supabase
    .from("offerings")
    .select("id")
    .eq("slug", "sisterhood-islamic-studies")
    .single();

  if (!offering) {
    console.error("   Program not found. Run seed.ts first.");
    process.exit(1);
  }

  // Update existing subjects with new details and instructor assignments
  const subjectUpdates = [
    {
      slug: "quran",
      title: "Qur'an — Indepth Tafseer",
      description:
        "Indepth Tafseer of selected Surahs. Course Book: Ma'ariful Qur'an (English). Urdu book (Bahishti Zewar) is easily available in the market.",
      instructor_email: "neelam.ijaz@nisaalhuda.com",
      sort_order: 1,
    },
    {
      slug: "hadith",
      title: "Hadith — Zad ut Talibeen",
      description:
        "Course Book: Zad ut Talibeen — Translation & Explanation of 300+ Ahadith. Studying the sayings and actions of the Prophet Muhammad (peace be upon him).",
      instructor_email: "sana.ahmed@nisaalhuda.com",
      sort_order: 2,
    },
    {
      slug: "fiqh",
      title: "Fiqh — Understanding Shariah Laws",
      description:
        "Understanding Shariah laws for the Faraiz of Deen. Book: Heavenly Ornaments (English). Bahishti Zewar in Urdu is easily available in the market.",
      instructor_email: "kareemunnisa@nisaalhuda.com",
      sort_order: 3,
    },
    {
      slug: "arabic",
      title: "Arabic — Word to Word Translation",
      description:
        "Word to Word translation of selected Surahs from Qur'an. Basic Arabic grammar to make this translation easier. Book: Lughatul Arabia (Madina Books) Volume 1.",
      instructor_email: "sana.areeba@nisaalhuda.com",
      sort_order: 4,
    },
  ];

  for (const sub of subjectUpdates) {
    const instructorId = instructorIds[sub.instructor_email];
    if (!instructorId) {
      console.error(`   Instructor not found: ${sub.instructor_email}`);
      continue;
    }

    const { error } = await supabase
      .from("subjects")
      .update({
        title: sub.title,
        description: sub.description,
        instructor_id: instructorId,
        sort_order: sub.sort_order,
      })
      .eq("offering_id", offering.id)
      .eq("slug", sub.slug);

    if (error) {
      console.error(`   Error updating ${sub.slug}:`, error.message);
    } else {
      console.log(`   ✓ ${sub.title} → ${sub.instructor_email}`);
    }
  }

  // ─── Summary ───
  console.log("\n=== Seed Complete! ===\n");
  console.log("📋 Instructor Accounts (all use password: Instructor@123):");
  for (const inst of instructors) {
    console.log(`   ${inst.full_name.padEnd(35)} → ${inst.email}`);
  }
  console.log("\n📋 Subject → Instructor Assignments:");
  for (const sub of subjectUpdates) {
    console.log(`   ${sub.title.padEnd(40)} → ${sub.instructor_email}`);
  }
}

seed().catch(console.error);
