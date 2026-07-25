import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === 'signup') toast.success('Conta criada. Vamos configurar seu perfil.');
    nav('/app');
  };

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-4xl">
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === 'signin' ? 'Acesse sua máquina de conteúdo.' : 'Sua máquina de conteúdo médico começa aqui.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
            {busy ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            {mode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tenho conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
