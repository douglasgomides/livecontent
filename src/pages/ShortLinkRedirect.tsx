import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolveShortLink } from '@/lib/db';

// Tela pública /s/:slug — resolve o link curto e redireciona na hora. Existe
// só pra encurtar os links de pré-consulta/captação de lead (que ficam
// grandes com origem/UTM), não é um produto de link-in-bio.
export default function ShortLinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); return; }
    resolveShortLink(slug)
      .then(url => {
        if (url) window.location.replace(url);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Consulta Creator</p>
          <h1 className="font-serif text-2xl mb-3">Link não encontrado</h1>
          <p className="text-muted-foreground text-sm">Esse link curto não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center px-6 py-12">
      <p className="text-muted-foreground text-sm">Redirecionando…</p>
    </div>
  );
}
