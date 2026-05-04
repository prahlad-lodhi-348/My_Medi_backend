import { api, ApiError } from '@/src/api/client';
import { storage } from '@/src/lib/storage';
import { LoginResponse } from '@/src/types/phase2';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// ✅ Single clean User interface
interface User {
  username?: string;
  email?: string;
  is_email_verified: boolean;
  phone?: string;
  age?: number;
  gender?: string;
  date_of_birth?: string;
  caregiver?: string;
  caregiver_email?: string;
  caregiver_phoneno?: string;
  caregiver_relationship?: string;
  step_count?: number;
  water_intake?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: (authToken?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await storage.getToken();
        if (storedToken) {
          setToken(storedToken);
          await loadUser(storedToken);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const loadUser = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    try {
interface ProfileResponse {
        username?: string;
        name?: string;
        email?: string;
        is_email_verified?: boolean;
        phone?: string;
        age?: number;
        gender?: string;
        date_of_birth?: string;
        caregiver?: string;
        caregiver_email?: string;
        caregiver_phoneno?: string;
        caregiver_relationship?: string;
        step_count?: number;
        water_intake?: number;
        [key: string]: unknown;
      }

      const profileData = await api<ProfileResponse>("profile/", { token: activeToken });

      // ✅ Sab fields set ho rahe hain correctly
      setUser({
        username: profileData.username || profileData.name || 'User',
        email: profileData.email,
        is_email_verified: profileData.is_email_verified ?? false,
        phone: profileData.phone,
        age: profileData.age,
        gender: profileData.gender,
        date_of_birth: profileData.date_of_birth,
        caregiver: profileData.caregiver,
        caregiver_email: profileData.caregiver_email,
        caregiver_phoneno: profileData.caregiver_phoneno,
        caregiver_relationship: profileData.caregiver_relationship,
        step_count: profileData.step_count,
        water_intake: profileData.water_intake,
      });
    } catch (error) {
      console.error('Failed to fetch profile', error);

      if (error instanceof ApiError && error.status === 401) {
        await storage.removeToken();
        setToken(null);
        setUser(null);
        router.replace('/sign-in');
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await api<LoginResponse>('login/', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      const receivedToken = data.token;
      if (!receivedToken) {
        throw new Error("Login response missing token");
      }
      await storage.setToken(receivedToken);
      setToken(receivedToken);
      await loadUser(receivedToken);
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    }
  };

  const register = async (username: string, email: string, password: string, passwordConfirm: string) => {
    try {
      await api<{ detail?: string }>('register/', {
        method: 'POST',
        body: { username, email, password, password_confirm: passwordConfirm },
        skipAuth: true,
      });
    } catch (e) {
      console.error('Registration error:', e);
      throw e;
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      const currentToken = await storage.getToken();

      try {
        if (currentToken) {
          await api("logout/", { method: "POST", token: currentToken });
        }
      } catch (backendErr) {
        console.log("Backend logout failed (ignored):", backendErr);
      }

      await storage.removeToken();
      setToken(null);
      setUser(null);
      router.replace("/sign-in");
    } catch (e) {
      console.error("Logout cleanup error:", e);
      router.replace("/sign-in");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isLoggingOut, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};