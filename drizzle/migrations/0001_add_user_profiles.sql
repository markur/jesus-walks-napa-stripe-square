
-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN company TEXT,
ADD COLUMN website TEXT,
ADD COLUMN profile_picture TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN social_profiles JSONB,
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
