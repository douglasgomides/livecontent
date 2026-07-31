import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Página que o link de "Esqueci minha senha" abre. O Supabase já autentica o
// usuário com uma sessão de recuperação antes de chegar aqui (via hash da URL,
// tratado pelo próprio client) — só falta pedir a nova senha e confirmar.
export default function ResetPassword() {
  const { user, updatePassword, loading } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success('Senha atualizada.');
    nav('/app');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-3xl mb-3">Link inválido ou expirado</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Peça um novo link de recuperação de senha na tela de entrar.
          </p>
          <Button onClick={() => nav('/auth')} className="bg-gold-gradient text-primary-foreground gold-shadow">
            Voltar para entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-4xl">Nova senha</h1>
          <p className="text-muted-foreground mt-2 text-sm">Escolha uma nova senha para sua conta.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
            {busy ? 'Aguarde...' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
