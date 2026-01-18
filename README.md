# newduel-server

Servidor do NewDuel rodando em Nakama + runtime TypeScript.

## Responsabilidades
- Autenticacao, presenca, realtime, matchmaking
- RPCs com regras de economia/anti-abuso
- Match handlers (autoridade do jogo)
- Logs e auditoria de partidas

## Estrutura
- `docker/` compose e configs
- `nakama-runtime/index.ts` registro de RPCs e matches
- `nakama-runtime/rpc/` funcoes RPC
- `nakama-runtime/matches/` handlers de partida
- `nakama-runtime/modules/` economia, inventario, ranking, antiabuso
- `nakama-runtime/shared/` types e validacoes
- `migrations/` SQL
- `docs/` mapas e fluxos

## Mapas de RPC e Matches
Veja `docs/rpc-map.md`.
