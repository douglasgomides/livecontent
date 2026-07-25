# Consulta Creator

Sua máquina de conteúdo médico, sempre ligada. Grave consultas, palestras, áudios ou cole
um link — a ferramenta transcreve, anonimiza dados de paciente, extrai tópicos e gera
conteúdo pronto pra publicar em vários formatos, com verificação de compliance (CFM)
integrada.

## Stack

- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Claude (Anthropic) e Whisper (OpenAI) para o pipeline de IA

## Rodando localmente

Requisitos: Node.js e npm ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# Clone o repositório
git clone <URL_DO_REPO>
cd consulta-creator

# Instale as dependências
npm install

# Suba o servidor de desenvolvimento
npm run dev
```

## Variáveis de ambiente

Veja `.env` para as chaves do Supabase do projeto. As Edge Functions em
`supabase/functions/` exigem os secrets `ANTHROPIC_API_KEY` e `OPENAI_API_KEY`
configurados no backend.

## Build de produção

```sh
npm run build
npm run preview
```
