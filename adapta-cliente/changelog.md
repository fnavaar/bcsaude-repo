# Changelog

## 2026-08-20 — Task 11851c12: Preparar entrada unificada e permissões

- **Status**: Implementação concluída, aguardando deploy no Skip + teste humano
- **Arquivos criados/atualizados**:
  - `pocketbase/migrations/0054_adapta_spec1_001.js` — Campos canal, responsavel, colaboradores, motivo_estado + estados pendente/em_classificacao
  - `pocketbase/hooks/leads_manual_create.js` — Rota POST /backend/v1/leads/manual
  - `pocketbase/hooks/backfill_canal.js` — Rota POST /backend/v1/leads/backfill-canal
  - `pocketbase/hooks/leads_import_agendamento.js` — Atualizado: adiciona canal='agendamento'
- **Evidências**: `05_entregas/task-11851c12/README.md`
- **Próximo passo**: Copiar arquivos para Skip project (id 50190), publicar, executar backfill e testar T1–T4
- **Decisão registrada**: API CAEPF = GR 3 + Agropecuária (sem enriquecimento externo). Sem novas integrações API (Serasa, SPC, etc.)

## 2026-08-17 — Fixture de teste

- Criada saída local para validar allowlist, hashes e manifesto.
