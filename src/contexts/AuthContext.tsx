import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'hrd' | 'cs';
  branch_id: string | null;
  faktor_pengali: number | null;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.get<Profile>('/auth/profile');
      setUser(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      apiClient.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await apiClient.post<{ token: string; user: Profile }>('/auth/login', {
      email,
      password,
    });
    apiClient.setToken(data.token);
    setUser(data.user);
  };

  const signOut = async () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
