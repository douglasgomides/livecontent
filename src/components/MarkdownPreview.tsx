import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Pra linhas de lista compactas de uma linha só (truncate), onde renderizar
// blocos markdown de verdade (títulos, listas) quebraria o layout — tira só a
// sintaxe (##, **, ---, [texto](url)) e deixa o texto puro pra exibição.
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
}

// Renderiza o corpo da peça formatado (títulos, negrito, listas, divisórias)
// em vez do markdown cru (##, **, ---) — usado em qualquer lugar que só
// EXIBE a peça. O markdown cru fica reservado só pra view de edição/texto puro.
export default function MarkdownPreview({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="font-serif text-xl mt-3 mb-1 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="font-serif text-lg mt-3 mb-1 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="font-medium text-base mt-2 mb-1 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          hr: () => <hr className="border-border/60 my-3" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">{children}</a>
          ),
          code: ({ children }) => <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">{children}</blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
