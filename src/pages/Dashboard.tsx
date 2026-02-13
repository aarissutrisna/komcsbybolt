import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/supabase';
import { formatCurrency } from '../utils/currency';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayOmzet: 0,
    todayCommission: 0,
    totalCommission: 0,
    monthlyOmzet: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const stats = await apiClient.get<any>('/omzet/stats');
      setStats({
        todayOmzet: stats.today_total || 0,
        monthlyOmzet: stats.month_total || 0,
        todayCommission: 0,
        totalCommission: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        todayOmzet: 0,
        monthlyOmzet: 0,
        todayCommission: 0,
        totalCommission: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Selamat datang, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Omzet Hari Ini</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todayOmzet)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Komisi Hari Ini</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todayCommission)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Omzet Bulan Ini</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyOmzet)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <Users className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Komisi</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCommission)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informasi Sistem</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-600">Email: </span>
            <span className="text-sm font-semibold text-gray-900">{user?.email}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Role: </span>
            <span className="text-sm font-semibold text-gray-900 uppercase">{user?.role}</span>
          </div>
          {user?.faktor_pengali && (
            <div>
              <span className="text-sm font-medium text-gray-600">Faktor Pengali: </span>
              <span className="text-sm font-semibold text-gray-900">{user.faktor_pengali}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
