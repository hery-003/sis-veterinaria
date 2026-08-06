import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SESSION_DURATION = 8 * 60 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  syncUser: (user: User | null) => void;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    if (stored) {
      if (!loginTime || Date.now() - parseInt(loginTime, 10) > SESSION_DURATION) {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        return null;
      }
      return JSON.parse(stored);
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const savedUser = loadUser();
    if (savedUser) {
      window.api.setUser(savedUser).catch(() => {});
    }
    setRestoring(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User | null> => {
    const u = await window.api.login(username, password);
    if (u) {
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('loginTime', String(Date.now()));
      setUser(u);
    }
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await window.api.logout(); } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    setUser(null);
  }, []);

  const syncUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else { localStorage.removeItem('user'); localStorage.removeItem('loginTime'); }
  }, []);

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.rol);
  }, [user]);

  const value = React.useMemo(() => ({ user, login, logout, syncUser, hasRole }), [user, login, logout, syncUser, hasRole]);

  if (restoring) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType | null {
  return useContext(AuthContext);
}
