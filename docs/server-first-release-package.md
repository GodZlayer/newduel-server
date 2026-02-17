# Server-First Release Package

Data: 2026-02-17

## Objetivo
- Aplicar mudancas **somente no servidor** sem quebrar o client atual.
- Preparar publicacao manual na outra maquina (mesmo repositorio Git).

## Changelog curto
- Corrigido `create_stage` para criar `match_handler` (antes criava modulo incorreto).
- Adicionados RPCs versionados:
  - `get_bootstrap_v2`
  - `get_map_recipe_v2`
- Adicionado sistema de flags de servidor (`data/game/feature_flags.json`):
  - `enable_v2_bootstrap`
  - `enable_map_recipe`
  - `enforce_recipe_hash` (default `false`, compativel com client legado)
- `create_stage` e `stage_update` agora anexam metadados de receita:
  - `seed`, `modeProfile`, `recipeHash`, `contentVersion`, `contentHash`.
- `match_handler` passou a carregar e propagar metadados no `S_MATCH_WELCOME`.
- Validacao de hash no `C_CLIENT_READY` foi implementada, mas so e aplicada quando `enforce_recipe_hash=true`.

## Compatibilidade (v1/v2)
- Fluxo antigo permanece ativo (`v1`).
- RPCs novos sao aditivos (`v2`) e nao substituem os atuais.
- `enforce_recipe_hash=false` mantem client atual funcional.

## Checklist de validacao local (antes do push)
- [x] `npm run build` em `newduel-server` sem erro.
- [x] `data/modules/main.js` atualizado pelo build.
- [ ] `create_stage` cria partida sem erro de modulo.
- [ ] `join_stage` + `request_stage_state` funcionando com client atual.
- [ ] `get_bootstrap_v2` responde `{ ok: true, ... }`.
- [ ] `get_map_recipe_v2` responde `{ ok: true, seed, recipeHash, ... }`.
- [ ] Com `enforce_recipe_hash=false`, `C_CLIENT_READY` legado continua aceito.

## Checklist para deploy manual na maquina remota
- [ ] `git pull` na maquina do servidor.
- [ ] `npm install` (se necessario) e `npm run build`.
- [ ] Garantir presenca de `data/game/feature_flags.json`.
- [ ] Reiniciar servico Nakama.
- [ ] Smoke test com client atual:
  - [ ] login
  - [ ] selecao de personagem
  - [ ] lobby
  - [ ] criar/entrar sala
  - [ ] iniciar partida

## Observacao operacional
- Nao ha automacao de deploy remoto neste pacote.
- Mudancas de client ficam bloqueadas ate validacao online do server.
