/*
  # Create Default Superadmin User

  1. Default Admin Account
    - Email: admin@komcs.pjb
    - Password: admin123456
    - Role: admin
    - Username: superadmin
    - Nama: Super Administrator

  2. Default Branch
    - Creates a default "Kantor Pusat" branch for admin assignment

  3. Important Notes
    - Password can be changed after first login via Settings page
    - Admin has full access to all features and data
    - RLS policies allow admin to manage all resources
*/

-- Insert default branch (Pusat)
INSERT INTO branches (id, name, target_min, target_max)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Kantor Pusat',
  0,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Create default superadmin in auth.users
DO $$
DECLARE
  admin_user_id uuid := 'a0000000-0000-0000-0000-000000000000';
  admin_email text := 'admin@komcs.pjb';
  admin_password text := 'admin123456';
  encrypted_password text;
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    -- Generate encrypted password (Supabase uses bcrypt)
    encrypted_password := crypt(admin_password, gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      encrypted_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Super Administrator"}',
      false,
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;

-- Insert corresponding user profile
INSERT INTO users (
  id,
  username,
  nama,
  role,
  branch_id,
  faktor_pengali
) VALUES (
  'a0000000-0000-0000-0000-000000000000',
  'superadmin',
  'Super Administrator',
  'admin',
  'a0000000-0000-0000-0000-000000000001',
  0.75
)
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  nama = EXCLUDED.nama,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id;