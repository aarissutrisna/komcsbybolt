import { useAuth } from '../contexts/AuthContext';

export function DataAttendance() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Data Kehadiran & Omzet</h1>
        <p className="text-gray-600 mt-2">Input dan kelola data kehadiran serta penjualan harian</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <p className="text-blue-900">
          Modul data kehadiran dan omzet akan ditampilkan di sini setelah terintegrasi dengan API backend.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Role Anda: <span className="font-semibold">{user?.role.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
