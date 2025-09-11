-- Add comment functionality columns to existing promotions table
-- This migration safely adds comment columns without breaking existing functionality

-- Add comment columns to promotions table
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS comment_templates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_comment TEXT,
ADD COLUMN IF NOT EXISTS allow_custom_comments BOOLEAN DEFAULT true;

-- Add comment columns to shares table
ALTER TABLE shares 
ADD COLUMN IF NOT EXISTS comment_text TEXT,
ADD COLUMN IF NOT EXISTS comment_template_used VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_custom_comment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comment_length INTEGER DEFAULT 0;

-- Add comment analytics columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_comments_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_templates_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_custom_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_comment_length DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS most_used_template VARCHAR(255);

-- Add constraints for data integrity
ALTER TABLE promotions 
ADD CONSTRAINT IF NOT EXISTS check_comment_templates_array 
CHECK (jsonb_typeof(comment_templates) = 'array');

ALTER TABLE promotions 
ADD CONSTRAINT IF NOT EXISTS check_custom_comment_length 
CHECK (custom_comment IS NULL OR length(custom_comment) <= 280);

ALTER TABLE shares 
ADD CONSTRAINT IF NOT EXISTS check_comment_length 
CHECK (comment_text IS NULL OR length(comment_text) <= 280);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_comment_templates ON promotions USING GIN (comment_templates);
CREATE INDEX IF NOT EXISTS idx_shares_comment_template ON shares(comment_template_used);
CREATE INDEX IF NOT EXISTS idx_shares_is_custom_comment ON shares(is_custom_comment);

-- Add comments to columns for documentation
COMMENT ON COLUMN promotions.comment_templates IS 'JSON array of selected comment templates (max 3)';
COMMENT ON COLUMN promotions.custom_comment IS 'Custom comment text (max 280 characters)';
COMMENT ON COLUMN promotions.allow_custom_comments IS 'Whether users can add custom comments';

COMMENT ON COLUMN shares.comment_text IS 'The actual comment text used in the share';
COMMENT ON COLUMN shares.comment_template_used IS 'Which template was used (if any)';
COMMENT ON COLUMN shares.is_custom_comment IS 'Whether the comment was custom or from template';
COMMENT ON COLUMN shares.comment_length IS 'Length of the comment for analytics';

COMMENT ON COLUMN users.total_comments_made IS 'Total number of comments made by user';
COMMENT ON COLUMN users.total_templates_used IS 'Total number of templates used by user';
COMMENT ON COLUMN users.total_custom_comments IS 'Total number of custom comments made by user';
COMMENT ON COLUMN users.average_comment_length IS 'Average length of comments made by user';
COMMENT ON COLUMN users.most_used_template IS 'Most frequently used comment template by user';
