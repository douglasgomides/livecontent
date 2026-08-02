// Guarda mínima contra SSRF nos webhooks configurados pelo próprio médico
// (dispatch-publish-webhook, dispatch-whatsapp-followup): mesmo sendo o
// próprio médico quem cadastra a URL, uma conta comprometida (ou um valor
// colado por engano) não deve conseguir fazer o servidor da function bater
// em endereço interno/metadata da nuvem. Não resolve DNS rebinding (fora do
// escopo de uma checagem simples), só bloqueia os alvos óbvios.
const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local, inclui metadata de nuvem (169.254.169.254)
  return false;
}

export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith('.local')) return false;
  if (isPrivateIPv4(host)) return false;
  return true;
}
