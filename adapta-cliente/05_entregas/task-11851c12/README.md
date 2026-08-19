# Task 11851c12 — Preparar entrada unificada e permissões

## Evidências

### Arquivos criados/atualizados

| Arquivo | Tipo | SHA | Descrição |
|---|---|---|---|
| `pocketbase/migrations/0054_adapta_spec1_001.js` | Migração | `4a2613fc` | Campos canal/responsavel/colaboradores/motivo_estado + estados pendente/em_classificacao |
| `pocketbase/hooks/leads_manual_create.js` | Hook novo | `b8aea080` | Rota POST /backend/v1/leads/manual — entrada WhatsApp/indicação |
| `pocketbase/hooks/leads_import_agendamento.js` | Hook atualizado | `fead3981` | Adiciona canal='agendamento' e responsavel='sistema' |
| `pocketbase/hooks/backfill_canal.js` | Hook novo | `c4b78136` | Rota POST /backend/v1/leads/backfill-canal — preenche leads existentes |

### Critérios de aceite

| CA | Critério | Status |
|---|---|---|
| CA-1-001 | Lead por agendamento consultável com canal, responsavel, estado e evento | ✅ (canal='agendamento', responsavel='sistema') |
| CA-1-002 | Lead WhatsApp registrado manualmente na mesma estrutura | ✅ (rota /leads/manual criada) |
| CA-1-003 | Entrada incompleta permanece pendente com campo impeditivo | ✅ (motivo_estado preenchido) |
| CA-1-004 | Criação mantém ator, data e evento | ✅ (evento entrada_manual registrado) |
| CA-1-005 | Nenhum envio ou integração externa | ✅ (hook não envia nada) |

### Testes pendentes (teste humano)

| Teste | Descrição | Comando esperado |
|---|---|---|
| T1 | Criar lead manual completo | POST /backend/v1/leads/manual {razao_social, cnpj, canal:'whatsapp', responsavel:'Raquel'} |
| T2 | Criar lead sem CNPJ (pendente) | POST /backend/v1/leads/manual {razao_social, canal:'whatsapp', responsavel:'Raquel'} |
| T3 | Verificar backfill | POST /backend/v1/leads/backfill-canal |
| T4 | Verificar lead importado com canal | Listar leads, confirmar canal='agendamento' |

### Pendências

- [ ] Aplicar migração 0054 no PocketBase do Skip (id 50190)
- [ ] Copiar hooks para o projeto Skip
- [ ] Executar backfill
- [ ] Testar T1–T4
