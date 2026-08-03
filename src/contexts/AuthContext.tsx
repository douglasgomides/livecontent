import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { hydrateStore, resetStore } from '@/lib/store';
import { toFriendlyMessage } from '@/lib/friendlyError';

interface AuthCtx {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; alreadyRegistered?: boolean }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

// Supabase retorna as mensagens de erro em inglês, cruas — traduz as mais comuns
// pra algo acionável em português em vez de repassar o texto técnico direto.
// Qualquer erro que não bata com um padrão conhecido cai num fallback genérico
// (nunca no texto técnico original) — o erro real ainda vai pro console via
// toFriendlyMessage, só não aparece na tela.
function friendlyAuthError(err: { message: string }): string {
  const m = err.message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos. Se esqueceu a senha, use "Esqueci minha senha".';
  if (m.includes('user already registered')) return 'Esse e-mail já tem conta. Entre em vez de criar uma nova, ou use "Esqueci minha senha" se não lembrar a senha.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada (e o spam).';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network request failed')) {
    return 'Não conseguimos conectar agora. Verifique sua internet e tente de novo.';
  }
  return toFriendlyMessage(err, 'Não foi possível completar essa ação agora. Tente novamente em instantes.');
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Listener first (never miss an event)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setHydrated(false);
        // hydrate off the auth callback to avoid deadlocks
        setTimeout(() => {
          hydrateStore(s.user.id).finally(() => setHydrated(true));
        }, 0);
      } else {
        resetStore();
        setHydrated(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        hydrateStore(data.session.user.id).finally(() => setHydrated(true));
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendlyAuthError(error) } : {};
  };

  const signUp: AuthCtx['signUp'] = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (!error) return {};
    const alreadyRegistered = error.message.toLowerCase().includes('user already registered');
    return { error: friendlyAuthError(error), alreadyRegistered };
  };

  const resetPassword: AuthCtx['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { error: friendlyAuthError(error) } : {};
  };

  const updatePassword: AuthCtx['updatePassword'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: friendlyAuthError(error) } : {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading, hydrated, signIn, signUp, resetPassword, updatePassword, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
