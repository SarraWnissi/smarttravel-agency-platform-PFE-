import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI, getToken, setToken, removeToken } from "../../services/api";

export type UserRole = "client" | "admin";

export interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  telephone?: string;
  adresseFacturation?: string;
}

interface RegisterData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  message: string;
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem("st_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    // Vérifier que le token est encore valide
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      removeToken();
      localStorage.removeItem("st_user");
      return null;
    }
    return u as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getUserFromStorage();
    setUser(saved);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await authAPI.login(email, password);
      const { user: apiUser, token } = res;

      const role: UserRole = apiUser.role === "ADMIN" ? "admin" : "client";

      const authUser: AuthUser = {
        id: apiUser._id,
        prenom: apiUser.firstname ?? "",
        nom: apiUser.lastname ?? "",
        email: apiUser.email,
        role,
      };

      setToken(token);
      localStorage.setItem("st_user", JSON.stringify(authUser));
      setUser(authUser);

      return { success: true, message: "Connexion réussie", role };
    } catch (err: any) {
      return { success: false, message: err.message || "Email ou mot de passe incorrect" };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await authAPI.register(data);
      return { success: true, message: "Compte créé avec succès" };
    } catch (err: any) {
      return { success: false, message: err.message || "Erreur lors de l'inscription" };
    }
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem("st_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
