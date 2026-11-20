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

**Fase 4**: aberturas offline (`src/openings/`): base com ~3.800 aberturas (nome/ECO) do [lichess chess-openings](https://github.com/lichess-org/chess-openings) (CC0), carregada sob demanda; explorador em árvore na aba *Aberturas*; modo estudo (ideia, plano, erros comuns; o detalhe segue o nível do perfil); repertório por perfil com treino de linhas e repetição espaçada (caixas de Leitner); abertura reconhecida durante a partida e na revisão (com o lance em que saiu da teoria); sugestão pelo currículo conforme o Elo.

**Fase 5**: aba *Desafios* (`src/challenges/`): quebra-cabeças táticos offline por tema (subconjunto de 176 puzzles do banco do [Lichess](https://database.lichess.org/#puzzles), CC0) com dificuldade pelo Elo do perfil e efeito no Elo/pontos fracos; treino de finais contra o motor (R+D, R+T, peão/oposição, Lucena); "o que fazer nesta posição?" (FEN → melhor lance + explicação por regras); jogos customizados (FEN/editor de tabuleiro, handicaps, relógio com incremento, cor e força do motor); desafio diário com sequência por perfil.

Planejado: empacotamento Tauri (desktop) e Capacitor (mobile).

Abaixo de 1320 Elo o Stockfish não suporta `UCI_Elo`; nesses níveis usamos Skill Level baixo, profundidade 1–2 e uma chance de lance aleatório.