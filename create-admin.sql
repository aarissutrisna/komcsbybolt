-- Script untuk membuat admin pertama
--
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard → Authentication → Users
-- 2. Klik "Add User" → "Create New User"
-- 3. Isi:
--    Email: admin@komcs.com
--    Password: Admin123!
--    Auto Confirm User: CENTANG
-- 4. Klik "Create User"
-- 5. CATAT UUID user yang baru dibuat (contoh: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- 6. Ganti 'UUID_USER_DARI_SUPABASE' di bawah dengan UUID yang dicatat
-- 7. Jalankan script ini di Supabase SQL Editor

-- Ganti dengan UUID yang sebenarnya dari auth.users
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES (
  'UUID_USER_DARI_SUPABASE',  -- GANTI INI dengan UUID dari langkah 5
  'admin',
  'Administrator',
  'admin',
  NULL,
  NULL
);

-- Verifikasi user berhasil dibuat
SELECT id, username, nama, role FROM users WHERE role = 'admin';
