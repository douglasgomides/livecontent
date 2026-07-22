## Consulta Creator — Plano de construção

Substituir totalmente o MedContent. Novo visual preto/dourado, mobile-first, com Supabase (Lovable Cloud) e Lovable AI Gateway (Whisper + Claude/Gemini).

### Pré-requisito bloqueante

**Habilitar Lovable Cloud** em Connectors → Lovable Cloud → Tool Permissions ("Always allow"). Sem isso não há banco, auth, storage nem edge functions. Assim que ativado, começo a Fase 1.

### Fases

Escopo grande demais para uma entrega única. Divido em 4 fases entregáveis. Cada uma termina utilizável. Você aprova o plano geral agora; entrego fase por fase e você decide quando seguir para a próxima.

---

### Fase 1 — Fundação + Fluxo core (primeira entrega)

**Identidade visual nova:** fundo `#0A0A0A`, dourado `#C9A84C`, creme `#F5F0E8`, Cormorant Garamond (títulos) + Inter (corpo). Tokens semânticos no `index.css` e `tailwind.config.ts`. Removo todas as telas do MedContent.

**Backend (Lovable Cloud):**
- `profiles` (id → auth.users, name, specialty, ideal_patient, tone, onboarded)
- `sessions` (id, user_id, source: recording|upload|voice_note|text|science|news, status, duration, audio_path, created_at)
- `transcripts` (session_id, raw_text, anonymized_text, pii_findings jsonb)
- `topics` (session_id, title, summary, funnel_stage C0/C1/C2/C3, included)
- `content_pieces` (topic_id, format, body, cfm_score, cfm_flags jsonb, status)
- Bucket `session-audio` privado
- RLS: cada médico vê só o próprio; grants explícitos

**Auth:** email/senha + Google (defaults Lovable Cloud), páginas `/login`, `/signup`, `/reset-password`.

**Onboarding (7 passos):** tipo de perfil → especialidade → paciente ideal (texto livre) → tom → 3 amostras de voz/texto (upload no storage) → pular WhatsApp/canais → tutorial → "Pronto. Aperte Iniciar Consulta."

**Home Dashboard (`/`):**
- Botão "Iniciar Consulta" gigante, dourado, dominante
- Ações secundárias: Upload gravação, Science to Content, News to Content, Voice Note (stubs nas fases seguintes)
- Lista de sessões recentes com status do pipeline

**Fluxo de gravação (mobile-first):**
- Tela cheia com indicador pulsante vermelho, timer, pausar, encerrar
- Web Audio API captura PCM e monta WAV completo (conforme guideline de STT do Lovable AI)
- Aviso claro: mantenha a tela ligada
- Upload do WAV para `session-audio` ao encerrar

**Pipeline (edge functions, cada uma um passo, chamadas em cadeia):**
1. `transcribe-session` — Whisper via `openai/gpt-4o-transcribe`
2. `anonymize-session` — Claude via chat model; retorna transcript anonimizado + findings estruturados (regra de ouro do prompt: remove nome/CPF/plano/prontuário/endereço/profissão rara/condição rara; mantém gênero, idade, contexto clínico, falas sem PII)
3. `extract-topics` — Claude; retorna N tópicos com título/summary/funnel C0-C3

**Tela de processamento:** progresso ao vivo (subscription no `sessions.status`) com os 6 checks pedidos.

**Tela de revisão de anonimização (não pulável):** duas colunas, PII em vermelho à esquerda, verde à direita, resumo "X informações anonimizadas", editor manual do texto final, botão "Confirmar e extrair temas".

**Tela de revisão de temas:** cards com título editável, resumo, estágio de funil (dropdown), toggle incluir.

**Seleção de formato (Fase 1 = 4 formatos):** Reel IG (roteiro), Carrossel IG (slide a slide), Legenda IG, Post LinkedIn. Toggle por tópico. Ajustes salvos como defaults do usuário.

**Geração de conteúdo + CFM Score:** edge function `generate-content` por peça; cada peça inclui score CFM (0-100) e flags (promessa de resultado, garantia de cura, superlativo, especialidade, identificação indireta, depoimento como endosso). ≥90 aprovado; 70-89 aviso; <70 bloqueia exportar/publicar.

**Editor de conteúdo:** edição inline, botão regenerar com nota livre, aprovar, copiar, exportar (texto/PDF simples).

---

### Fase 2 — Inputs alternativos

- Upload de gravação (áudio ou vídeo com extração de áudio; segmentação temática para palestras via Claude antes de extrair tópicos)
- Voice Note (mesmo gravador, mais curto)
- Import de texto colado/arquivo
- Science to Content — Artigo único (URL ou PDF; parse via `document--parse_document`)
- Science to Content — Revisão (3-10 PDFs; síntese, consensos e contradições; export de slides PDF)
- Prompts gerados (perguntas por especialidade para residentes; grava resposta)
- News to Content: usa `web_search` restrito por especialidade + Claude para curadoria

---

### Fase 3 — Formatos extras + Brain Builder

**Formatos adicionais:** Blog SEO+LLM, YouTube longo, YouTube Shorts, Google My Business, Podcast (roteiro), Newsletter, Slides de aula (PDF via renderer no cliente).

**Brain Builder (3 camadas):**
- L1 Voice profile: usa amostras do onboarding em todo prompt de geração
- L2 Clinical memory: tabelas agregadas de temas recorrentes, perfis, dúvidas frequentes, casos (materialized via triggers em `topics`/`sessions`)
- L3 Performance memory: quando integrar canais, guarda métricas por formato/canal/tom
- Painel `/brain` mostrando o que a plataforma "sabe" do médico

---

### Fase 4 — Integrações externas (exige suas contas)

- **Podcast áudio (ElevenLabs):** você cadastra `ELEVENLABS_API_KEY` como secret; edge function TTS
- **WhatsApp (Z-API):** você cria conta Z-API, cadastra `ZAPI_INSTANCE`+`ZAPI_TOKEN`; webhook edge function `whatsapp-inbound` para receber áudio/arquivo e criar `session`
- **Relatório semanal (Segunda 8h):** cron via `pg_cron` chamando edge function que envia via Z-API
- **Conexão de canais sociais:** OAuth por canal (LinkedIn, IG via Meta) — cada um exige App Review próprio, escopo grande, tratado caso a caso ao chegar aqui

---

### Notas técnicas

- **Modelos:** Whisper `openai/gpt-4o-transcribe` para STT; `google/gemini-2.5-pro` (ou o default de chat do gateway na época) para anonimização, extração, geração e CFM. Todas as chaves ficam server-side; `LOVABLE_API_KEY` é auto-provisionada.
- **Gravação em background:** MVP assume tela ligada (sua escolha). Aviso no início. Timer continua se o usuário voltar para o app; se o navegador suspender, ao voltar mostro estado + opção de retomar/encerrar.
- **Compliance por design:** anonimização é passo obrigatório e não pulável; conteúdo <70 CFM é bloqueado no export.
- **Prompts em português:** todos os prompts de sistema em pt-BR, tom conforme perfil do médico.
- **Segurança:** RLS em todas as tabelas, grants explícitos, storage privado com signed URLs curtas para reprodução, edge functions com CORS + validação Zod, roles em tabela separada (`user_roles`) se algum dia precisar de admin.

---

### O que preciso de você para começar

1. Habilitar Lovable Cloud (bloqueante)
2. Confirmar: começo pela **Fase 1** completa e você aprova antes de eu tocar na Fase 2?