-- Helper function: look up a profile by email via auth.users join
-- Used by the enrollment email check (service_role context)
CREATE OR REPLACE FUNCTION public.get_profile_by_email(lookup_email TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT) AS $$
  SELECT p.id, p.full_name
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(u.email) = LOWER(lookup_email)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if an email exists in auth.users
CREATE OR REPLACE FUNCTION public.email_exists(lookup_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = LOWER(lookup_email)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
