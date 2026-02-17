# RPC Map e Match Handlers

> Nota: este arquivo contém seções legadas. O runtime ativo atual usa RPCs `snake_case` em `newduel-server/src`.
> Para o pacote server-first desta etapa, os novos RPCs adicionados são:
> - `get_bootstrap_v2`
> - `get_map_recipe_v2`

## Fluxos principais

### Login e selecao de personagem
- Auth: Nakama built-in (device/steam/etc)
- RPC: `SelectCharacter`
  - Request: `{ characterId: string }`
  - Response: `{ character, inventory, stats, permissions }`

### Lobby e salas
- RPC: `CreateRoom`
  - Request: `{ mode: string, wager?: number, isRanked?: boolean }`
  - Response: `{ roomId, leaderId, rules }`
- RPC: `JoinRoom`
  - Request: `{ roomId }`
  - Response: `{ room, members, rules }`
- RPC: `LeaveRoom`
  - Request: `{ roomId }`
- RPC: `Ready`
  - Request: `{ roomId }`
- RPC: `Unready`
  - Request: `{ roomId }`

### Inicio de instancia
- RPC: `StartRoomMatch` (apenas lider)
  - Request: `{ roomId }`
  - Response: `{ matchId }`

### Economia e mercado
- RPC: `MarketListItem`
  - Request: `{ itemId, price, currency }`
- RPC: `MarketCancel`
  - Request: `{ listingId }`
- RPC: `MarketBuy`
  - Request: `{ listingId }`
- RPC: `ResetBuildWithGold`
  - Request: `{ characterId }`
- RPC: `ConvertSpoilsToGold`
  - Request: `{ amount }`

### Guilda
- RPC: `GuildCraft`
  - Request: `{ recipeId }`
- RPC: `GuildUpgrade`
  - Request: `{ upgradeId }`

## Match Handlers

### pve_match.ts
- estagios, boss, falha total
- drops no final + bonus XP
- distribuicao por contribuicao

### pvp_match.ts
- 1x1, FFA, times
- aposta obrigatoria (ouro/espolios)
- desempate por dano
- abandono: punicao + compensacao 30%
- anti-trade: bloqueio de confrontos apos 2 derrotas

### hybrid_match.ts
- estagio 1: corrida PvE com 2 vidas
- countdown e mobs nao contabilizados no inicio
- buffs para vencedor do estagio 1
- estagio 2: PvE+PvP com 1 vida
- vitoria por last hit no boss
- falha total se todos morrerem

### ranked_match.ts
- matchmaking
- mapas aleatorios por formato
- +1/-1 por personagem
- abandono = derrota so para quem saiu

## Observacoes de seguranca
- Web envia apenas intencoes (move/cast/use)
- Server decide dano real, drops e vencedor
- Logs e auditoria obrigatorios por partida
