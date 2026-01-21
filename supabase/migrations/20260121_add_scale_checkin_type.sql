-- Add 'scale_checkin' to the survey_type constraint

-- Drop the existing constraint
ALTER TABLE survey_submissions
DROP CONSTRAINT IF EXISTS survey_submissions_survey_type_check;

-- Allow NULL or any of the defined types (NULL is valid for legacy data)
ALTER TABLE survey_submissions
ADD CONSTRAINT survey_submissions_survey_type_check
CHECK (survey_type IS NULL OR survey_type IN ('scale_feedback', 'scale_end', 'grow_baseline', 'grow_end', 'scale_checkin'));
