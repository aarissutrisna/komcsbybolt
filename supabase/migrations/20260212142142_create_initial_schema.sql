/*
  # Initial Schema untuk KomCS PJB - Sistem Komisi CS

  1. Tabel Baru
    - `branches` - Data cabang/toko PJB
    - `users` - Data pengguna (HRD, CS, Admin)
    - `attendance_data` - Data kehadiran dan omzet harian
    - `mutations` - Data mutasi pegawai antar cabang

  2. Security
    - Enable RLS pada semua tabel
    - Policies untuk role-based access control

  3. Auto Functions
    - Auto update timestamp
    - Auto calculate komisi
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_cabang text UNIQUE NOT NULL,
  nama_cabang text NOT NULL,
  alamat text DEFAULT '',
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nama text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'hrd', 'cs')),
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  faktor_pengali decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create attendance_data table
CREATE TABLE IF NOT EXISTS attendance_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  tanggal date NOT NULL,
  status_kehadiran text NOT NULL CHECK (status_kehadiran IN ('hadir', 'izin', 'sakit', 'alpha')),
  omzet decimal(15,2) DEFAULT 0 NOT NULL,
  komisi decimal(15,2) DEFAULT 0 NOT NULL,
  keterangan text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, tanggal)
);

-- Create mutations table
CREATE TABLE IF NOT EXISTS mutations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  from_branch_id uuid REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  to_branch_id uuid REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  tanggal_mutasi date NOT NULL,
  keterangan text DEFAULT '',
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_data(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance_data(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance_data(tanggal);
CREATE INDEX IF NOT EXISTS idx_mutations_user ON mutations(user_id);
CREATE INDEX IF NOT EXISTS idx_mutations_from_branch ON mutations(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_mutations_to_branch ON mutations(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations(status);

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admin can manage all branches" ON branches;
  DROP POLICY IF EXISTS "HRD and CS can view branches" ON branches;
  DROP POLICY IF EXISTS "Admin can manage all users" ON users;
  DROP POLICY IF EXISTS "Users can view own data" ON users;
  DROP POLICY IF EXISTS "HRD can view users in same branch" ON users;
  DROP POLICY IF EXISTS "Admin can manage all attendance" ON attendance_data;
  DROP POLICY IF EXISTS "HRD can view attendance in same branch" ON attendance_data;
  DROP POLICY IF EXISTS "CS can view own attendance" ON attendance_data;
  DROP POLICY IF EXISTS "CS can insert own attendance" ON attendance_data;
  DROP POLICY IF EXISTS "CS can update own attendance" ON attendance_data;
  DROP POLICY IF EXISTS "Admin can manage all mutations" ON mutations;
  DROP POLICY IF EXISTS "HRD can view mutations in their branch" ON mutations;
  DROP POLICY IF EXISTS "Users can view own mutations" ON mutations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- RLS Policies for branches
CREATE POLICY "Admin can manage all branches"
  ON branches FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "HRD and CS can view branches"
  ON branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- RLS Policies for users
CREATE POLICY "Admin can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "HRD can view users in same branch"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.role = 'hrd'
      AND u.branch_id = users.branch_id
    )
  );

-- RLS Policies for attendance_data
CREATE POLICY "Admin can manage all attendance"
  ON attendance_data FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "HRD can view attendance in same branch"
  ON attendance_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.role = 'hrd'
      AND u.branch_id = attendance_data.branch_id
    )
  );

CREATE POLICY "CS can view own attendance"
  ON attendance_data FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "CS can insert own attendance"
  ON attendance_data FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'cs'
  );

CREATE POLICY "CS can update own attendance"
  ON attendance_data FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for mutations
CREATE POLICY "Admin can manage all mutations"
  ON mutations FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "HRD can view mutations in their branch"
  ON mutations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.role = 'hrd'
      AND (u.branch_id = mutations.from_branch_id OR u.branch_id = mutations.to_branch_id)
    )
  );

CREATE POLICY "Users can view own mutations"
  ON mutations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance_data;
DROP TRIGGER IF EXISTS update_mutations_updated_at ON mutations;
DROP TRIGGER IF EXISTS calculate_attendance_komisi ON attendance_data;

-- Triggers for auto updating updated_at
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mutations_updated_at
  BEFORE UPDATE ON mutations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to auto calculate komisi
CREATE OR REPLACE FUNCTION calculate_komisi()
RETURNS TRIGGER AS $$
DECLARE
  user_faktor decimal(10,2);
BEGIN
  SELECT faktor_pengali INTO user_faktor
  FROM users
  WHERE id = NEW.user_id;

  IF NEW.status_kehadiran = 'hadir' THEN
    NEW.komisi = COALESCE(NEW.omzet * COALESCE(user_faktor, 0), 0);
  ELSE
    NEW.komisi = 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto calculating komisi
CREATE TRIGGER calculate_attendance_komisi
  BEFORE INSERT OR UPDATE ON attendance_data
  FOR EACH ROW
  EXECUTE FUNCTION calculate_komisi();
