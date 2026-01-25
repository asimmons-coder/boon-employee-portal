-- Add grow_midpoint to survey_type constraint
-- This survey type is used for GROW program midpoint check-in (session 6)

ALTER TABLE survey_submissions
DROP CONSTRAINT IF EXISTS survey_submissions_survey_type_check;

ALTER TABLE survey_submissions
ADD CONSTRAINT survey_submissions_survey_type_check
CHECK (survey_type IN ('scale_feedback', 'scale_end', 'grow_baseline', 'grow_midpoint', 'grow_end'));
