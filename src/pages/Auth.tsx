import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Auth() {
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) { toast.error(error); return; }
    setResetSent(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      setBusy(false);
      if (error) { toast.error(error); return; }
      nav('/app');
      return;
    }
    const { error, alreadyRegistered } = await signUp(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      // E-mail já cadastrado tentando criar conta de novo: manda direto pra
      // tela de login em vez de deixar preso repetindo o mesmo erro.
      if (alreadyRegistered) setMode('signin');
      return;
    }
    toast.success('Conta criada. Vamos configurar seu perfil.');
    nav('/app');
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
            <h1 className="font-serif text-4xl">Recuperar senha</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {resetSent
                ? 'Se esse e-mail tiver conta, enviamos um link pra redefinir a senha.'
                : 'Informe seu e-mail e enviamos um link pra redefinir a senha.'}
            </p>
          </div>
          {!resetSent && (
            <form onSubmit={submitForgot} className="space-y-5">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
                {busy ? 'Aguarde...' : 'Enviar link'}
              </Button>
            </form>
          )}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode('signin'); setResetSent(false); }}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Voltar para entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-4xl">
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === 'signin' ? 'Acesse sua conta.' : 'Sua produção de conteúdo médico começa aqui.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Senha</Label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
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
