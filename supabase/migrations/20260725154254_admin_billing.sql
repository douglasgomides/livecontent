-- ============ ADMIN ============
-- Lista pequena e explícita de quem pode acessar o painel admin — nunca via
-- coluna editável pelo próprio usuário (evita escalonamento de privilégio).
CREATE TABLE public.app_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
-- Ninguém lê/escreve via client (nem o próprio admin) — só Edge Functions com
-- service role checam isso. Sem policy nenhuma = bloqueado por padrão pra authenticated/anon.

CREATE OR REPLACE FUNCTION public.is_app_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = uid);
$$;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(UUID) TO authenticated, service_role;

-- ============ BILLING / SUBSCRIPTIONS ============
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'none');

CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'none',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- Leitura: só a própria assinatura. Escrita: só Edge Functions (webhook do Stripe),
-- nunca o client direto — senão o próprio usuário poderia se dar plano "pro" de graça.
CREATE POLICY "read own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Toda conta nova começa no free, automaticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
