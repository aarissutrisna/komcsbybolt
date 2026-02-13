import { useAuth } from '../contexts/AuthContext';

export function Branches() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Cabang</h1>
        <p className="text-gray-600 mt-2">Kelola daftar cabang dan target penjualan</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <p className="text-blue-900">
          Modul manajemen cabang akan ditampilkan di sini setelah terintegrasi dengan API backend.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Akses terbatas untuk: <span className="font-semibold">ADMIN</span>
        </p>
      </div>
    </div>
  );
}
