"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "./api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  business_name: string | null;
  subscription_tier: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    businessName?: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .fetch("/auth/me")
        .then(setUser)
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.post("/auth/login", {
      email,
      password,
    });
    api.setToken(access_token);
    const me = await api.fetch("/auth/me");
    setUser(me);
    router.push("/dashboard");
  };

  const signup = async (
    email: string,
    password: string,
    businessName?: string
  ) => {
    await api.post("/auth/signup", {
      email,
      password,
      business_name: businessName,
    });
    await login(email, password);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
