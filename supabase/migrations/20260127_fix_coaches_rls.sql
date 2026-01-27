-- Migration: Add RLS policy for coaches table
-- The coaches table should be readable by all authenticated users
-- Coach profiles are not sensitive data

-- First check if RLS is enabled, if so add a read policy
-- If RLS is not enabled, this is a no-op

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "authenticated_users_read_coaches" ON coaches;

-- Create policy allowing all authenticated users to read coach profiles
CREATE POLICY "authenticated_users_read_coaches"
ON coaches
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon users to read (for public coach pages if needed)
DROP POLICY IF EXISTS "anon_users_read_coaches" ON coaches;

CREATE POLICY "anon_users_read_coaches"
ON coaches
FOR SELECT
TO anon
USING (true);

-- Create a SECURITY DEFINER function as a fallback
-- This bypasses RLS entirely for coach lookups
CREATE OR REPLACE FUNCTION get_coach_by_name(coach_name_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  headline TEXT,
  notable_credentials TEXT,
  special_services TEXT,
  icf_level TEXT,
  is_scale_coach BOOLEAN,
  is_grow_coach BOOLEAN,
  is_exec_coach BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.bio,
    c.photo_url,
    c.headline,
    c.notable_credentials,
    c.special_services,
    c.icf_level::TEXT,
    c.is_scale_coach,
    c.is_grow_coach,
    c.is_exec_coach
  FROM coaches c
  WHERE lower(c.name) = lower(coach_name_param)
     OR lower(c.name) LIKE '%' || lower(coach_name_param) || '%'
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_coach_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_by_name(TEXT) TO anon;

-- Similar function for coach ID lookup
CREATE OR REPLACE FUNCTION get_coach_by_id(coach_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  headline TEXT,
  notable_credentials TEXT,
  special_services TEXT,
  icf_level TEXT,
  is_scale_coach BOOLEAN,
  is_grow_coach BOOLEAN,
  is_exec_coach BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.bio,
    c.photo_url,
    c.headline,
    c.notable_credentials,
    c.special_services,
    c.icf_level::TEXT,
    c.is_scale_coach,
    c.is_grow_coach,
    c.is_exec_coach
  FROM coaches c
  WHERE c.id = coach_id_param
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coach_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_by_id(UUID) TO anon;
