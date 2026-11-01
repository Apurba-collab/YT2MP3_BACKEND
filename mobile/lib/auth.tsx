import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, saveTokens, clearTokens, hasSession, setOnLogout } from "./api";

type Ctx = {
  signedIn: boolean; ready: boolean;
  signIn: (u: string, p: string) => Promise<void>;
  signUp: (u: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOnLogout(() => setSignedIn(false));
    hasSession().then((s) => { setSignedIn(s); setReady(true); });
  }, []);

  const signIn = async (username: string, password: string) => {
    const t = await api("/api/auth/login/", "POST", { username, password }, false);
    await saveTokens(t.access, t.refresh); setSignedIn(true);
  };
  const signUp = async (username: string, password: string) => {
    await api("/api/auth/register/", "POST", { username, password }, false);
    await signIn(username, password);
  };
  const signOut = async () => { await clearTokens(); setSignedIn(false); };

  return <AuthCtx.Provider value={{ signedIn, ready, signIn, signUp, signOut }}>{children}</AuthCtx.Provider>;
}
