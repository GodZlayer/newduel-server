# Migração total OGZ -> Nakama

Este diretório contém a pipeline de migração e os artefatos de ingestão dos dados do `ogz-server-master` para o `nakama-server`.

## Objetivos
- Paridade total com o executável original (MatchServer + Locator + Keeper/Agent + Admin).
- Ingestão completa de todos os arquivos de dados e configs do server original.
- Substituição dos dados atuais do `nakama-server`.

## Artefatos
- `data/source_manifest.txt`: lista completa dos arquivos de entrada do server original.
- `data/`: pasta para saídas convertidas (JSON/CSV) e schemas.
- `scripts/`: scripts de conversão e validação.

## Próximos passos
1. Definir schemas alvo por arquivo (XML/INI/DAT).
2. Implementar conversores para JSON.
3. Importar para storage do Nakama e validar checksums.
