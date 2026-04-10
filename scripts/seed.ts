/**
 * Database Seed Script
 * Seeds the first program: "Sisterhood Islamic Studies" with 4 subjects.
 *
 * Usage:  npx tsx scripts/seed.ts
 *
 * Uses the service_role key to bypass RLS (admin-level access).
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables. Check .env.local");
  process.exit(1);
}

// Admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding database...\n");

  // ─── 1. Create Instructor Profile ────────────────────────
  // We need an auth user first. Create via admin API.
  console.log("1. Creating instructor user...");

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: "instructor@nisaalhuda.com",
      password: "Instructor@123",
      email_confirm: true,
      user_metadata: { full_name: "Ustadha Maryam" },
    });

  if (authError && !authError.message.includes("already been registered")) {
    console.error("Error creating instructor:", authError.message);
    process.exit(1);
  }

  let instructorId: string;

  if (authUser?.user) {
    instructorId = authUser.user.id;
    console.log(`   Created instructor: ${instructorId}`);

    // Update role to 'instructor'
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "instructor" })
      .eq("id", instructorId);

    if (roleError) {
      console.error("Error updating instructor role:", roleError.message);
    } else {
      console.log("   Updated role to 'instructor'");
    }
  } else {
    // User already exists — find them
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.email === "instructor@nisaalhuda.com"
    );
    if (!existing) {
      console.error("Could not find existing instructor user");
      process.exit(1);
    }
    instructorId = existing.id;
    console.log(`   Instructor already exists: ${instructorId}`);
  }

  // ─── 2. Create Admin User ───────────────────────────────
  console.log("\n2. Creating admin user...");

  const { data: adminAuth, error: adminAuthError } =
    await supabase.auth.admin.createUser({
      email: "admin@nisaalhuda.com",
      password: "Admin@123",
      email_confirm: true,
      user_metadata: { full_name: "Admin" },
    });

  if (adminAuthError && !adminAuthError.message.includes("already been registered")) {
    console.error("Error creating admin:", adminAuthError.message);
  } else if (adminAuth?.user) {
    console.log(`   Created admin: ${adminAuth.user.id}`);

    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", adminAuth.user.id);

    if (roleError) {
      console.error("Error updating admin role:", roleError.message);
    } else {
      console.log("   Updated role to 'admin'");
    }
  } else {
    console.log("   Admin already exists");
  }

  // ─── 3. Insert the Program ──────────────────────────────
  console.log("\n3. Creating program: Sisterhood Islamic Studies...");

  const { data: offering, error: offeringError } = await supabase
    .from("offerings")
    .upsert(
      {
        title: "Sisterhood Islamic Studies",
        slug: "sisterhood-islamic-studies",
        description: `A comprehensive program designed exclusively for sisters, covering the essential Islamic sciences that every Muslimah should know.

This program brings together four core subjects — Fiqh (Islamic Jurisprudence), Arabic (Classical Language), Hadith (Prophetic Traditions), and Qur'an (Recitation & Tajweed) — taught by qualified female instructors in a supportive, sisters-only environment.

What you'll gain:
• Deep understanding of Islamic Jurisprudence (Fiqh) for daily life
• Ability to read and understand Classical Arabic
• Knowledge of authentic Prophetic Traditions (Hadith)
• Beautiful Qur'anic recitation with proper Tajweed

Each subject includes live weekly classes, recorded sessions for revision, downloadable notes, and community discussion groups. The program runs for 6 months with lifetime access to all recordings and resources.`,
        short_description:
          "A comprehensive 6-month program covering Fiqh, Arabic, Hadith, and Qur'an — taught live by qualified female instructors.",
        type: "program",
        price: 15000,
        status: "published",
        instructor_id: instructorId,
        schedule_start: "2026-05-01",
        schedule_end: "2026-10-31",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (offeringError) {
    console.error("Error creating offering:", offeringError.message);
    process.exit(1);
  }

  console.log(`   Created: "${offering.title}" (${offering.id})`);

  // ─── 4. Insert Subjects ─────────────────────────────────
  console.log("\n4. Creating subjects...");

  const subjectsData = [
    {
      offering_id: offering.id,
      title: "Fiqh — Islamic Jurisprudence",
      slug: "fiqh",
      description:
        "Learn the fundamentals of Islamic law covering purification, prayer, fasting, and transactions. Based on the Hanafi school of thought with comparative discussions.",
      instructor_id: instructorId,
      sort_order: 1,
    },
    {
      offering_id: offering.id,
      title: "Arabic — Classical Language",
      slug: "arabic",
      description:
        "Build your Arabic reading, writing, and comprehension skills from the ground up. Covers Nahw (grammar) and Sarf (morphology) through classical texts.",
      instructor_id: instructorId,
      sort_order: 2,
    },
    {
      offering_id: offering.id,
      title: "Hadith — Prophetic Traditions",
      slug: "hadith",
      description:
        "Study the sayings and actions of the Prophet Muhammad (peace be upon him). Covers the 40 Hadith of Imam An-Nawawi with chain analysis and practical lessons.",
      instructor_id: instructorId,
      sort_order: 3,
    },
    {
      offering_id: offering.id,
      title: "Qur'an — Recitation & Tajweed",
      slug: "quran",
      description:
        "Perfect your Qur'anic recitation with proper Tajweed rules. Covers Makharij al-Huroof (articulation points), essential Tajweed rules, and daily recitation practice.",
      instructor_id: instructorId,
      sort_order: 4,
    },
  ];

  for (const subject of subjectsData) {
    const { data, error } = await supabase
      .from("subjects")
      .upsert(subject, { onConflict: "offering_id,slug" })
      .select()
      .single();

    if (error) {
      console.error(`   Error creating ${subject.title}:`, error.message);
    } else {
      console.log(`   ✓ ${data.title}`);
    }
  }

  // ─── 5. Insert Sample Lessons ───────────────────────────
  console.log("\n5. Creating sample lessons...");

  // Get the subject IDs we just created
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, slug")
    .eq("offering_id", offering.id);

  if (subjects && subjects.length > 0) {
    const subjectMap = Object.fromEntries(
      subjects.map((s) => [s.slug, s.id])
    );

    const lessonsData = [
      {
        offering_id: offering.id,
        subject_id: subjectMap["fiqh"],
        title: "Introduction to Fiqh & Its Importance",
        description: "Understanding what Fiqh is, why it matters, and the major schools of Islamic jurisprudence.",
        sort_order: 1,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["fiqh"],
        title: "Tahara — Purification & Wudu",
        description: "Detailed study of ritual purification, types of water, Wudu (ablution), and Ghusl (full bath).",
        sort_order: 2,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["arabic"],
        title: "The Arabic Alphabet & Pronunciation",
        description: "Master the 28 Arabic letters, their forms, and proper pronunciation from the articulation points.",
        sort_order: 1,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["arabic"],
        title: "Basic Sentence Structure (Jumlah Ismiyyah)",
        description: "Learn how Arabic sentences are formed — the nominal sentence (Mubtada & Khabar).",
        sort_order: 2,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["hadith"],
        title: "Introduction to Hadith Sciences",
        description: "What is Hadith? Understanding the chain of narration (Isnad), text (Matn), and grading system.",
        sort_order: 1,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["hadith"],
        title: "Hadith 1: Actions are by Intentions",
        description: "Study of the famous hadith 'Innamal a'malu bin niyyat' — its meaning, implications, and daily application.",
        sort_order: 2,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["quran"],
        title: "Makharij al-Huroof — Articulation Points",
        description: "Learn where each Arabic letter originates from in the mouth, throat, and nasal passage.",
        sort_order: 1,
        is_published: true,
      },
      {
        offering_id: offering.id,
        subject_id: subjectMap["quran"],
        title: "Rules of Noon Sakinah & Tanween",
        description: "Master the four rules: Izhar, Idgham, Iqlab, and Ikhfa — with practical recitation exercises.",
        sort_order: 2,
        is_published: true,
      },
    ];

    for (const lesson of lessonsData) {
      const { error } = await supabase.from("lessons").insert(lesson);
      if (error) {
        console.error(`   Error: ${lesson.title}:`, error.message);
      } else {
        console.log(`   ✓ ${lesson.title}`);
      }
    }
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📋 Test Accounts:");
  console.log("   Admin:      admin@nisaalhuda.com / Admin@123");
  console.log("   Instructor: instructor@nisaalhuda.com / Instructor@123");
  console.log(`\n🌐 Visit: /catalog to see the program`);
  console.log(`🔗 Direct: /offerings/sisterhood-islamic-studies`);
}

seed().catch(console.error);
