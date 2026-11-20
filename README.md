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



Abaixo de 1320 Elo o Stockfish não suporta `UCI_Elo`; nesses níveis usamos Skill Level baixo, profundidade 1–2 e uma chance de lance aleatório.

## Fase 7: tema IDE e calibração

- Interface estilo IntelliJ (Darcula e Light), abas, barra de status e navegação inferior no celular. Tabuleiro com casas quadradas, destaque do último lance, lances legais, setas de dica, animação e barra de avaliação.
- Peças SVG do conjunto **cburnett** (via Lichess), por George Williams: GPLv2+ / BSD / CC BY-SA 3.0.
- O Elo é calibrado por **uma partida** contra o Stockfish que adapta a força a cada lance; o Elo estimado vem da precisão média e dos erros graves, com faixa de confiança, após 12 lances (ou fim da partida). Dá para pular e informar o Elo. O quiz de posições é treino complementar (pontuação por erros/tempo) e mexe pouco no Elo.

## Instalar e empacotar (Fase 6)

O mesmo código web roda em todas as plataformas; tudo (incluindo Stockfish WASM e dados) funciona offline.

**PWA (qualquer navegador / celular)** — `npm run build && npm run preview`, abra no navegador e use "Instalar app" / "Adicionar à tela inicial". O service worker guarda o app, o motor e os dados para uso offline.

**Desktop (Tauri 2: Windows, macOS, Linux)** — requisitos: [Rust](https://rustup.rs) e as [dependências do Tauri](https://tauri.app/start/prerequisites/). Rodar em dev: `npm run tauri dev`. Instalador: `npm run tauri:build` (saída em `src-tauri/target/release/bundle/`).

**Android (Capacitor)** — requisitos: JDK 21 e Android SDK. `npm run android:debug` gera `android/app/build/outputs/apk/debug/app-debug.apk`; para abrir no Android Studio: `npm run cap:sync && npx cap open android`. APK assinado para a Play Store exige uma keystore sua (não incluída).

**iOS** — requer um Mac com Xcode: `npx cap add ios && npm run cap:sync && npx cap open ios` (não configurado neste repositório).

**Builds automáticos** — o workflow `.github/workflows/release.yml` gera instaladores desktop (Linux/Windows/macOS) e o APK Android como artefatos; ao enviar uma tag `v*` eles vão para um release em rascunho. O `ci.yml` roda testes e build em PRs.

O ícone-fonte está em `scripts/app-icon.png` (ícones de plataforma: `npx tauri icon scripts/app-icon.png`).
