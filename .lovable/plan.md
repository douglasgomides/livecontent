# Reorganização do Consulta Creator

Foco: deixar a ferramenta mais clara e navegável, sem adicionar features novas. Fase 3 fica pausada.

## 1. Navegação — sidebar persistente

Hoje o `AppShell` tem um header simples com links. Vou trocar por um layout com **sidebar shadcn colapsável** (ícone-only quando fechada), mantendo header fino só com trigger + perfil.

Grupos do menu:

- **Criar** (destaque dourado no topo)
  - Gravar consulta
  - Upload de áudio
  - Voice Note
  - Science to Content
- **Trabalho**
  - Consultas (antiga Home, virou lista dedicada)
  - Biblioteca de conteúdo
- **Conta**
  - Ajustes

A rota `/app` passa a ser um **Dashboard** enxuto (visão geral + atalhos), separando "página inicial" de "lista de consultas".

## 2. Home → Dashboard + Consultas

Hoje a Home mistura 4 cartões de entrada + lista de consultas num scroll longo.

Divisão:

- **`/app` — Dashboard**
  - Bloco "Começar agora" com os 4 cartões de entrada (grid 2×2, compacto).
  - 3 stat cards: consultas no mês, peças aprovadas, score CFM médio.
  - "Últimas 3 consultas" com link "Ver todas".
- **`/app/consultas` — Lista completa**
  - Busca por título/tema.
  - Filtros: fonte (gravação/upload/voice/science), status (em processamento/pronta/aprovada), período.
  - Ordenação (mais recente, mais peças, maior score).
  - Cards com progresso do pipeline e contagem de peças.

## 3. SessionDetail — layout em 3 zonas

Hoje é um scroll único misturando pipeline, player, revisões e peças. Reorganizar em **layout com abas + coluna lateral fixa**:

```text
┌─────────────────────────────────────────────┐
│ Header sessão: título · fonte · data · CFM  │
├──────────────────────────┬──────────────────┤
│ Abas:                    │ Lateral fixa:    │
│  1. Pipeline             │ • Player áudio   │
│  2. Transcrição          │ • Metadados      │
│  3. Anonimização         │ • Ações rápidas  │
│  4. Temas                │   (exportar,     │
│  5. Conteúdo gerado      │    duplicar,     │
│                          │    arquivar)     │
└──────────────────────────┴──────────────────┘
```

- Aba ativa segue o estágio atual do pipeline automaticamente.
- Aba "Conteúdo gerado" agrupa peças por tema, com badges de status (rascunho/aprovada/publicada).
- Voice Note e Science escondem abas que não se aplicam (sem duplicar lógica — só filtro por `source`).

## 4. Biblioteca — organização real

Hoje é lista plana de todas as peças.

Nova estrutura:

- Topo: **filtros persistentes** (formato, status, tema, consulta de origem, período).
- Alternar visualização: **grid** (default) ou **lista compacta**.
- Agrupamento opcional: por consulta, por tema, ou por formato.
- Card da peça mostra: formato, tema, consulta de origem (clicável), score CFM, status.
- Ação em massa: selecionar múltiplas → exportar/aprovar.

## Detalhes técnicos

- Trocar `AppShell` para usar `SidebarProvider` + `Sidebar collapsible="icon"` + `SidebarTrigger` no header (conforme knowledge shadcn-sidebar).
- Criar `src/components/app/AppSidebar.tsx` com os 3 grupos e `NavLink` marcando ativo.
- Novas rotas em `App.tsx`:
  - `/app` → novo `Dashboard.tsx` (extraído da Home atual).
  - `/app/consultas` → nova `Consultas.tsx` (lista + filtros movidos da Home).
  - Home.tsx removida; Recording/Upload/VoiceNote/Science permanecem nas rotas atuais.
- `SessionDetail.tsx` refatorada com `Tabs` do shadcn e grid `lg:grid-cols-[1fr_320px]`. Lógica do pipeline/estado atual preservada, só reorganizada visualmente.
- `Library.tsx` ganha componentes internos `LibraryFilters` e `LibraryGrid`/`LibraryList`; filtros no estado local (sem persistência agora).
- Nada de mudança em `mockPipeline.ts`, `storage.ts` ou tipos — só apresentação/navegação.

## Fora de escopo

- Fase 3 (Brain Builder, formatos extras).
- Novas integrações ou mudanças no motor CFM.
- Persistência de filtros/preferências de visualização.
