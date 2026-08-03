// Geração de imagem via OpenAI gpt-image-1 — usado tanto pro fundo de arte
// orgânica (carousel/stories) quanto pro criativo de anúncio pago. Mesmo
// provedor, só muda o tamanho pedido por formato.
//
// Guarda ética: nunca gerar rosto/pessoa reconhecível nem simular ser foto real
// de um médico, paciente ou clínica específica (propaganda enganosa) — todo
// prompt do médico é sempre embrulhado com essa restrição antes de ir pro modelo.
const MODEL = 'gpt-image-1';

const SAFETY_PREFIX =
  'Fundo decorativo/ilustrativo ou ambiente genérico, sem rosto ou pessoa reconhecível, ' +
  'sem simular ser uma foto real de um médico, paciente ou clínica específica. ';

// gpt-image-1 só aceita esses três tamanhos de saída — o resultado é usado
// como fundo (organic) ou como o próprio criativo (anúncio), sem redimensionar
// pra um aspect ratio exato, então escolhemos o mais próximo do formato pedido.
export function nearestSupportedSize(width: number, height: number): '1024x1024' | '1024x1536' | '1536x1024' {
  const ratio = width / height;
  if (ratio > 1.15) return '1536x1024';
  if (ratio < 0.87) return '1024x1536';
  return '1024x1024';
}

export async function generateImageBase64(
  apiKey: string, prompt: string, width: number, height: number,
): Promise<string | null> {
  try {
    const size = nearestSupportedSize(width, height);
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: SAFETY_PREFIX + prompt, size, n: 1 }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const b64 = data.data?.[0]?.b64_json;
    return typeof b64 === 'string' ? b64 : null;
  } catch {
    return null;
  }
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
