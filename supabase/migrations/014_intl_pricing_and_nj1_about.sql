-- ============================================================
-- Migration 014: International (USD) pricing + NJ1 About update
-- - Adds offerings.price_usd (nullable). When set, the enrollment
--   wizard surfaces a third "International" payment option.
-- - Adds enrollments.payment_currency to record the currency the
--   student paid in (PKR/INR/USD). Defaults to PKR for back-compat.
-- - Sets Noor Journey One: price_usd = 15 + new About description.
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Schema additions ───
ALTER TABLE offerings
    ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10, 2);

ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS payment_currency TEXT NOT NULL DEFAULT 'PKR';

-- ─── 2. Noor Journey One: international fee + About copy ───
UPDATE offerings
SET
    price_usd = 15,
    description = E'REGISTRATION OPEN NOW ✅\n\n' ||
                  E'Noor Journey One🌸✨\n' ||
                  E'A One Year in-depth ilm of Deen study, focused on developing a deeper connection with Allah ﷻ  through understanding the Qur''an, Hadith, Fiqh and Basic Arabic Language.\n\n' ||
                  E'Devoting a little bit of our day to acquiring the ilm of Deen is what cuts through the noise of modern life and addresses the quiet crisis most of us carry: a heart that feels lost, restless, and searching for stillness in all the wrong places. This particular form of study is not about lectures on theory. It is a call to return to what the heart was always meant to hold. 💗💕\n\n' ||
                  E'Presented by:\n' ||
                  E'✨Nisa AlHuda Community✨\n' ||
                  E'🌷A highly sustainable course, specially designed for School/College/University students and working professional women.\n' ||
                  E'🌷Study hours: Only one hour/day —4 days a week only.\n\n' ||
                  E'💫 Classes Starting: April 27th IN SHAA ALLAH\n' ||
                  E'⛔ Strictly Female Only | Ages 12yrs+\n' ||
                  E'🗓️ Online | Monday to Thursday \n' ||
                  E'⏰ 6 pm - 7pm PKT | 6.30pm - 7.30pm IST | 9am - 10am EST'
WHERE slug = 'noor-journey-one';
