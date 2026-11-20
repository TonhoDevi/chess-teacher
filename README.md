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
- `src/game/` – lógica própria sobre chess.js (status, lista de lances, desfazer)
- `src/components/` – UI (tabuleiro próprio, toque/clique para mover)
- `src/i18n/` – detecção de idioma e catálogos (adicione `es` em `messages.ts`/`locale.ts`)

Planejado: análise/dicas, perfis e currículo adaptativo por Elo, aberturas, desafios/jogos customizados, empacotamento Tauri (desktop) e Capacitor (mobile).

Abaixo de 1320 Elo o Stockfish não suporta `UCI_Elo`; nesses níveis usamos Skill Level baixo, profundidade 1–2 e uma chance de lance aleatório.