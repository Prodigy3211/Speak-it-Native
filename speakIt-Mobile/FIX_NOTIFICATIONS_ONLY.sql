-- FIX NOTIFICATIONS ONLY: Setup push_tokens table and permissions

-- ========================================
-- CREATE PUSH_TOKENS TABLE AND PERMISSIONS
-- ========================================

-- Create push_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Enable RLS on push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;

-- Create policies for push_tokens
CREATE POLICY "Users can view their own push tokens" ON push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens" ON push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" ON push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- CREATE HELPER FUNCTIONS
-- ========================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for push_tokens
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify push_tokens policies were created correctly
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'push_tokens'
ORDER BY cmd;

-- Show push_tokens table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position; 