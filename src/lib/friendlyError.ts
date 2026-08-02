// Nunca repassa detalhe de schema/infraestrutura (nome de tabela/coluna, "schema
// cache", RLS, etc.) pro usuário final — sempre uma mensagem genérica amigável,
// com o erro real logado só no console (observability), nunca na tela.
export function toFriendlyMessage(err: unknown, fallback: string): string {
  console.error(`[friendlyError] ${fallback}`, err);
  return fallback;
}
