
-- Reset admin user script
-- Delete all existing users
DELETE FROM users;

-- Create admin user directly
INSERT INTO users (username, password, email, is_admin, is_verified, created_at, updated_at)
VALUES ('admin', 'TempPass123!', 'napadatai@duck.com', true, true, NOW(), NOW());

-- Verify the user was created
SELECT id, username, email, is_admin, created_at FROM users WHERE username = 'admin';
