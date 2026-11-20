# Chess Teacher

Software de xadrez com cara de instrutor (offline, sem APIs externas). **Fase 1**: tabuleiro jogável + adversário Stockfish com força ajustável (~400–1800 Elo), escolha de cor, desfazer, nova partida, lista de lances, tema claro/escuro e i18n (pt-BR, en).

## Como rodar

```bash
npm install      # também copia o Stockfish WASM para public/engine (script "prepare")
npm run dev      # desenvolvimento
npm test         # testes unitários
npm run build    # build de produção (PWA) em dist/
npm run preview  # serve o build
```

## Estrutura

- `src/engine/` – wrapper UCI do Stockfish (Web Worker) e mapeamento Elo → configuração
- `src/analysis/` – avaliação, classificação, táticas e explicações (lógica pura, testável)
- `src/game/` – lógica própria sobre chess.js (status, lista de lances, desfazer)
- `src/components/` – UI (tabuleiro próprio, toque/clique para mover)
- `src/i18n/` – detecção de idioma e catálogos (adicione `es` em `messages.ts`/`locale.ts`)

**Fase 2**: análise com um segundo Stockfish em força máxima (`src/analysis/`) — classificação de cada lance (brilhante/melhor/bom/imprecisão/erro/blunder), dica em dois níveis, explicações por regras (peça pendurada, garfo, cravada, espeto, mate; textos `x_*` em `messages.ts`, nível `beginner`/`intermediate` via `Detail`), revisão pós-partida com gráfico e lances críticos, e exportar/importar PGN.

**Fase 3**: perfis locais sem login (`src/profile/`, salvos em localStorage; progresso, histórico e preferências separados), Elo inicial informado ou medido por teste rápido, currículo por faixa (400–700, 700–1100, 1100+) em `src/learn/` com exercícios, Elo que sobe/desce com partidas e exercícios, detecção de pontos fracos por tema com treino de reforço, e força do motor/detalhe das explicações ligados ao perfil (modo "Auto").

Planejado: aberturas, desafios/jogos customizados, empacotamento Tauri (desktop) e Capacitor (mobile).

Abaixo de 1320 Elo o Stockfish não suporta `UCI_Elo`; nesses níveis usamos Skill Level baixo, profundidade 1–2 e uma chance de lance aleatório.