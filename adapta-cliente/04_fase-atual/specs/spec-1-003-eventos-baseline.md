# SPEC-1-003 — Trilha de eventos e baseline operacional da Fase 1

**Fase:** 1  
**Status:** planejada  
**Dono:** Consultor e Direção comercial; registro operacional pelo Comercial  
**Origem no escopo:** Fase 1; S3; RQ-015; RT-001; RT-008  
**Degrau da solução:** dependência existente — usar os eventos da estrutura `Oportunidades`/`Eventos` e uma aba de baseline em Google Sheets, sem ferramenta de analytics ou integração nova.

## Contexto e decisões fechadas

- **Estado atual:** o fluxo observado é manual e as métricas existentes não têm baseline comparável; o escopo exige fonte, janela, denominador e responsável antes de declarar metas (`03-Projeto/02-Escopo-Definitivo.md`, seções 2, 7 e 10.5).
- **Estado desejado:** toda entrada, mudança de estado, devolução, correção e sinalização relevante gera evento exportável; a aba `Baseline_F1` registra metadados comparáveis mesmo quando o valor ainda estiver `pendente`.
- **Decisões já fechadas:** Fase 1 mede a operação observável e prepara baseline; não promete meta numérica, conversão ou causalidade; não calcula tempo até proposta porque proposta está fora da fase; não inclui comunicação ou follow-up.
- **Autorização deste run:** o solicitante autorizou gerar as SPECs sem os demais aceites. Isso não aprova metas, janela final, responsável nominal ou sincronização Google Drive.
- **Bloqueios:** janela, denominador, unidade de veredito e responsável nominal ainda não foram confirmados. A estrutura deve exigir esses campos e marcar a linha como `insuficiente` até preenchimento; o executor não pode inventar valores.

## Resultado observável

Uma demonstração exporta os eventos de dois casos da Fase 1 e apresenta uma aba de baseline com, no mínimo, fonte, janela, denominador, unidade, responsável, valor observado e link de evidência. Qualquer campo não confirmado fica explicitamente pendente, sem ser tratado como zero.

## Limites e dependências

- **Inclui:** catálogo de eventos da Fase 1, timestamps, ator, transições, motivos de devolução/correção/duplicidade, exportação e registro de metadados de baseline.
- **Fora desta fase:** metas numéricas, comparação antes/depois já aprovada, tempo entrada→proposta, conversão, receita, painel de BI, integração com ERP, comunicação, follow-up e validação transversal da Fase 5.
- **Entradas e pré-condições:** eventos gerados pelas SPECs-1-001/1-002; acesso de leitura à estrutura operacional; responsável e janela preenchidos quando o baseline for oficialmente veredito.
- **Saídas/artefatos:** aba `Eventos`; aba `Baseline_F1`; export dos eventos; roteiro de cálculo/checagem; registro de campos pendentes.
- **Dependências e responsáveis:** SPECs-1-001 e 1-002; Direção/consultor definem fonte, janela, denominador, unidade e responsável; Comercial gera eventos pela operação.
- **Atores e permissões mínimas:** Comercial cria eventos operacionais; Direção consulta e aprova metadados; consultor revisa comparabilidade; ninguém altera evento histórico sem evento de correção.
- **Superfícies/arquivos/configurações afetadas:** aba `Eventos`, aba `Baseline_F1` e exportações da planilha operacional. Não criar conector de analytics.
- **Risco e plano B:** evento faltante ou métrica sem denominador gera falsa melhoria; plano B é marcar `insuficiente`, preservar a fonte original e repetir a medição após corrigir a captura.
- **Rollback ou reversão:** interromper a publicação da aba de baseline, exportar eventos já capturados, manter dados brutos e remover somente a visão derivada sem apagar o log.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| `Oportunidades` → `Eventos` | registro e histórico das SPECs-1-001/1-002 | `evento_id`, `oportunidade_id`, `tipo_evento`, `ocorrido_em`, `ator`, `origem`, `estado_anterior`, `estado_novo`, `motivo` | mesma conta/superfície autorizada; escrita mínima | `evento_id` único; reprocessamento não duplica evento idêntico | evento faltante deixa o caso marcado para reconciliação |
| `Eventos` → `Baseline_F1` | export do log, não estimativa de vídeo | `indicador`, `formula_ou_criterio_contagem`, `fonte`, `janela_inicio`, `janela_fim`, `denominador`, `unidade`, `responsavel`, `valor_observado`, `evidencia`, `status` | Direção/consultor com edição da definição; Comercial sem alterar resultado histórico | recalcular somente a partir do mesmo recorte e registrar data da extração | campo ausente → `status=insuficiente`; valor não vira zero |

**Proteções mínimas de dados:** `Baseline_F1` usa `oportunidade_id`/contagens e não replica nome, telefone, e-mail ou comentários; exportações de evidência ficam na pasta do plano; nenhum dado pessoal é enviado a ferramenta de analytics ou compartilhado fora do workspace autorizado.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-1-008 | oportunidade entra ou muda de estado | criar evento com ator, data, estado anterior/novo e motivo quando aplicável | falha de captura exige reconciliação antes do veredito | Fase 1; S3 |
| RN-1-009 | baseline é calculado | exigir fórmula/critério de contagem, fonte, janela, denominador, unidade e responsável | qualquer ausência mantém `insuficiente` | RQ-015; AC-008 |
| RN-1-010 | valor não pode ser obtido de fonte comparável | não preencher estimativa como observado | manter campo vazio e registrar impedimento | Escopo definitivo, seção 2 |
| RN-1-011 | evento é corrigido | criar novo evento de correção e manter o evento original | nunca editar silenciosamente histórico | Fase 1; governança/evidência |

## Fluxo e regras

1. Receber eventos das SPECs-1-001/1-002.
2. Conferir unicidade, oportunidade vinculada, ator, timestamp e transição.
3. Exportar o recorte de eventos da demonstração.
4. Definir indicadores somente com fonte e fórmula de contagem explicitadas.
5. Preencher `Baseline_F1` com fonte, janela, denominador, unidade e responsável; deixar valor/status pendente quando necessário.
6. Revisar se nenhuma estimativa foi promovida a baseline.
7. Entregar o roteiro e parar antes de declarar meta, ganho ou go-live.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | dois casos com entrada, validação e mudança de estado | eventos exportáveis e linha de baseline com metadados completos ou status explícito | reconciliação se faltar evento |
| Limite | fonte ou janela não confirmada | linha `insuficiente`, sem valor fictício e sem conclusão de meta | solicitar definição ao dono; não continuar para veredito |
| Falha | evento sem ator/data ou com transição impossível | caso excluído do indicador e colocado na lista de reconciliação | corrigir por novo evento, preservando o original |
| Regressão | recálculo do mesmo período | mesmo conjunto e resultado, ou diferença explicada pela nova extração registrada | parar se o denominador variar sem justificativa |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC; SPECs-1-001/1-002; `03-Projeto/02-Escopo-Definitivo.md`, seções 2, 7 e 10.5; `03-Projeto/requisitos.md`, RQ-015.
2. **Alterar somente:** catálogo de eventos, exportação e aba `Baseline_F1` descritos aqui.
3. **Não alterar:** metas, tabela de preço, API, permissões de comunicação, base avulsa, follow-up, handoff, ERP ou dados históricos originais.
4. **Executar nesta ordem:** conferir eventos; exportar; definir indicador; preencher metadados; validar insuficiências; demonstrar recálculo.
5. **Parar e pedir validação quando:** faltar fonte, janela, denominador, unidade ou responsável; houver pedido de meta numérica; ou o indicador depender de proposta/comunicação fora da Fase 1.
6. **Estado válido ao parar:** eventos brutos preservados; baseline identifica o que é observado e o que está pendente; nenhum resultado de negócio é declarado.

## Checklist de execução

- [ ] catálogo de eventos e tipos conferido
- [ ] eventos da entrada, correção, pendência e duplicidade exportados
- [ ] cada evento tem oportunidade, ator e timestamp
- [ ] `Baseline_F1` exige fonte, janela, denominador, unidade e responsável
- [ ] campos ausentes ficam `insuficiente`, sem zero ou estimativa
- [ ] recálculo do mesmo período reproduz a evidência
- [ ] nenhum indicador promete meta, conversão ou causalidade

## Critérios de aceite

- [ ] **CA-1-011:** eventos de entrada e mudança de estado de dois casos da Fase 1 podem ser exportados com oportunidade, ator, timestamp e transição.
- [ ] **CA-1-012:** `Baseline_F1` contém fórmula/critério de contagem, fonte, janela, denominador, unidade, responsável, valor observado, evidência e status para cada indicador.
- [ ] **CA-1-013:** indicador sem fonte, janela, denominador, unidade ou responsável fica `insuficiente` e não é tratado como zero.
- [ ] **CA-1-014:** correção de evento gera novo evento e preserva o histórico original.
- [ ] **CA-1-015:** o roteiro demonstra que Fase 1 não declara meta numérica, conversão, proposta ou comunicação.

## TDD da SPEC

**Correspondência aceite→prova:** CA-1-011 e CA-1-012 são provados no GREEN; CA-1-013 no GREEN
com metadado ausente; CA-1-014 na regressão; CA-1-015 no roteiro e no ponto de parada.

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | operação sem log/baseline | executar entrada e mudança de estado antes da configuração | não há export confiável nem metadados comparáveis | export/registro anterior |
| GREEN | capturar eventos e registrar baseline | executar o roteiro com dois casos e preencher os metadados disponíveis | eventos exportados; linha completa quando dados existem; linha insuficiente quando faltam dados | export, aba `Baseline_F1` e capturas |
| REFACTOR/REGRESSÃO | reprocessar e corrigir um evento | recalcular o mesmo período e registrar correção sem editar histórico | resultado reproduzível, correção rastreável e nenhum valor estimado promovido | dois exports, evento de correção e checklist |

**Dados/fixtures:** dois casos sintéticos, com entrada e mudança de estado; um evento deliberadamente sem responsável para testar `insuficiente`; período de teste explicitamente fictício.
**Caminhos de erro obrigatórios:** campo de baseline ausente, evento sem ator/data, transição impossível, recálculo com denominador diferente e pedido de meta não suportada.
**Evidência exigida:** export do log, aba `Baseline_F1`, lista de insuficiências e roteiro de recálculo.

## Handoff e operação

- **Como demonstrar:** abrir o log de dois casos, exportar eventos, preencher a linha de baseline e mostrar a marcação `insuficiente` quando faltar metadado.
- **Como operar depois:** Comercial gera eventos; Direção/consultor revisam comparabilidade; o dono do indicador fecha fonte, janela, denominador, unidade e responsável antes do veredito.
- **Como monitorar:** lista de eventos sem ator/data e indicadores `insuficiente`; revisão semanal durante o piloto.
- **Pendência conhecida:** baseline oficial, metas e responsável nominal continuam pendentes; não usar esta SPEC para declarar ganho ou go-live.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| `76dc96b5-2bf7-45d7-b907-6a2f22e88ce2` | Preparar catálogo de eventos e contrato `Baseline_F1` | Consultor | SPEC-1-003 | `Eventos` e `Baseline_F1` exigem oportunidade, ator, timestamp, fórmula/critério, fonte, janela, denominador, unidade, responsável, evidência e status, sem PII. | Preparação do GREEN: colunas, unicidade, `insuficiente` e proteções. | Esquema das abas, catálogo de eventos e permissões. | Task `9231990b-8acd-4766-8adc-ba7d0ba7d467`; acesso à estrutura. | Pendente |
| `7c1e4e79-f7d9-4622-8a2d-d242eef0e129` | Exportar eventos de dois casos da Fase 1 | Comercial | SPEC-1-003 | Eventos de entrada e mudança de estado de dois casos exportados com oportunidade, ator, timestamp e transição. | TDD GREEN: capturar eventos e recorte de dois casos. | Export do log, lista de eventos e capturas sem dados desnecessários. | Tasks `76dc96b5-2bf7-45d7-b907-6a2f22e88ce2` e `971bc228-d172-425c-acfc-add42c954fc8`; dois casos demonstráveis. | Pendente |
| `273c52c5-bd7b-424c-b92f-baff2c370c1b` | Registrar baseline, insuficiências e recálculo | Consultor | SPEC-1-003 | Metadados exigidos preenchidos; ausência marca `insuficiente`, nunca zero; recálculo do período reproduz ou explica o resultado. | TDD GREEN com metadados disponíveis/ausentes e REFACTOR/REGRESSÃO. | `Baseline_F1`, dois exports, insuficiências e data de extração. | Task `7c1e4e79-f7d9-4622-8a2d-d242eef0e129`; metadados confirmados ou explicitamente pendentes. | Pendente |
| `61f527ed-9d77-4af1-99af-19c7035a6dd6` | Corrigir evento e entregar rollback/handoff do baseline | Consultor | SPEC-1-003 | Correção cria novo evento e preserva histórico; rollback remove só visão derivada; roteiro não declara meta, conversão, proposta ou comunicação. | CA-1-014/CA-1-015; TDD REFACTOR/REGRESSÃO e Handoff. | Evento original/correção, exports, checklist e roteiro. | Task `273c52c5-bd7b-424c-b92f-baff2c370c1b`; histórico bruto preservado. | Pendente |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
