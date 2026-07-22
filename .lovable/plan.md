## Fase 2 — Inputs alternativos

Hoje só existe um caminho de entrada: **gravar ao vivo**. Esta fase adiciona três novos pontos de partida que caem no mesmo pipeline (anonimização → temas → geração → CFM), sem tocar em nada da Fase 1.

### O que muda para o médico

Na tela **Home**, o botão "Iniciar Consulta" vira um bloco de **4 formas de criar**:

1. **Gravar consulta ao vivo** (já existe)
2. **Upload de áudio** — arrasta um `.mp3`, `.m4a`, `.wav`, `.webm` de uma consulta já gravada (ex.: gravador do celular, Zoom, WhatsApp exportado)
3. **Voice Note (30–90s)** — grava um áudio curto de insight solto ("acabei de atender um caso curioso de…") e vira **1 post único**, sem passar por temas
4. **Science to Content** — cola o texto de um abstract, notícia, diretriz ou PDF (parseado no cliente) → gera conteúdo autoral em cima daquilo, atribuindo a fonte

Todos os quatro caminhos abrem a mesma `SessionDetail` e seguem o mesmo pipeline visual — a diferença fica apenas em quais estágios rodam.

### Diferenças por tipo de entrada

```text
Gravação ao vivo → transcribing → anonymization_review → topics_review → generating_content → ready
Upload de áudio  → transcribing → anonymization_review → topics_review → generating_content → ready
Voice Note       → transcribing → anonymization_review → generating_content(1 peça)         → ready
Science          → (sem anonim.) → topics_review(1 tema pré-preenchido) → generating_content → ready
```

Voice Note pula a revisão de temas porque o próprio áudio JÁ é o tema. Science pula a anonimização porque a fonte é pública — em vez disso mostra um selo "Baseado em: [fonte]" que sai em toda peça gerada.

### Novas telas / componentes

- **`Home`** — refatorada para mostrar os 4 cartões de entrada em grid, com o "Gravar" em destaque dourado e os outros três em creme secundário.
- **`UploadAudio.tsx`** — dropzone com `<input type="file">`, preview do nome + duração, validação de formato/tamanho (≤ 50 MB, mock local). Cria sessão com `source: 'upload'`.
- **`VoiceNote.tsx`** — variante enxuta da tela de gravação: timer com limite 90s, para automaticamente, sem consentimento longo (já é o médico falando sozinho).
- **`ScienceToContent.tsx`** — textarea grande + campos "Fonte" (link/DOI) e "Tipo" (abstract, notícia, diretriz). Botão "Processar" cria sessão com `source: 'science'`.

### Ajustes no pipeline mockado

- `createBlankSession(source, ...)` já aceita source — aproveitar.
- Adicionar `seedPipelineFromText(session, text)` que pula anonimização quando `source === 'science'` e usa o texto colado como base do primeiro tema.
- Em `SessionDetail`, ler `session.source` e:
  - **science** → começar em `topics_review` já com 1 tema pré-preenchido a partir do texto; anonimização não aparece no stepper.
  - **voice_note** → após anonimização, ir direto para `generating_content` fixando 1 formato = `caption` (ou o que o médico escolher no cartão).

### Detalhes técnicos

- Áudio de upload fica em memória via `URL.createObjectURL` (sem storage — sem Cloud). Mostrado num `<audio controls>` na SessionDetail.
- Voice Note reusa o `MediaRecorder` do `Recording.tsx`, extraído para um hook `useAudioRecorder(maxSec?)`.
- Science não precisa de parser de PDF nessa fase — só texto colado. PDF fica para depois se pedirem.
- Nenhuma peça nova de UI shadcn precisa ser instalada.

### Fora do escopo desta fase

- Parsing de PDF do lado cliente (adicionar depois se necessário)
- Transcrição real (fica no mock até você cadastrar as APIs)
- Novos formatos de saída, Brain Builder, integrações externas — Fases 3 e 4

### Ordem de implementação

1. Extrair hook `useAudioRecorder` do `Recording.tsx`
2. Novo `Home` com 4 cartões de entrada
3. `UploadAudio.tsx` + rota `/app/new/upload`
4. `VoiceNote.tsx` + rota `/app/new/voice-note`
5. `ScienceToContent.tsx` + rota `/app/new/science`
6. Ajustar `SessionDetail` para respeitar `source` nos estágios
7. Ajustar `mockPipeline` para os fluxos alternativos
