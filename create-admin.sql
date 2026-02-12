-- ============================================================================
-- Script untuk Membuat Admin Pertama di KomCS PJB
-- ============================================================================
--
-- PENTING: Baca QUICK-SETUP-ADMIN.md untuk panduan lengkap!
--
-- LANGKAH CEPAT:
--
-- 1. Buka Supabase Dashboard (https://supabase.com)
-- 2. Pilih project Anda
-- 3. Klik "Authentication" → "Users"
-- 4. Klik "Add User" → "Create New User"
-- 5. Isi:
--    Email: admin@komcs.com
--    Password: Admin123!
--    ☑ CENTANG "Auto Confirm User" ← PENTING!
-- 6. Klik "Create User"
-- 7. COPY UUID user yang muncul (contoh: f47ac10b-58cc-4372-a567-0e02b2c3d479)
-- 8. GANTI 'PASTE_UUID_DISINI' di bawah dengan UUID yang dicopy
-- 9. Buka "SQL Editor" → "New Query"
-- 10. Paste script ini dan klik "Run"
-- 11. Login di aplikasi dengan email & password yang dibuat
--
-- ============================================================================

-- GANTI 'PASTE_UUID_DISINI' dengan UUID dari auth.users!
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES (
  'PASTE_UUID_DISINI',  -- ← GANTI INI dengan UUID dari langkah 7!
  'admin',
  'Administrator',
  'admin',
  NULL,
  NULL
);

-- Verifikasi user berhasil dibuat
SELECT id, username, nama, role FROM users WHERE role = 'admin';

-- Jika berhasil, Anda akan melihat:
-- id: UUID yang Anda masukkan
-- username: admin
-- nama: Administrator
-- role: admin
--
-- Sekarang buka aplikasi dan login dengan:
-- Email: admin@komcs.com
-- Password: Admin123!
