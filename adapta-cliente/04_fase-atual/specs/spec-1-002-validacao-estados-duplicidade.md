# SPEC-1-002 — Validação mínima, estados e sinalização de duplicidade

**Fase:** 1  
**Status:** planejada  
**Dono:** Direção comercial; operação pelo Comercial e revisão pelo responsável designado  
**Origem no escopo:** Fase 1; RQ-001; RQ-002; RQ-003; RT-001  
**Degrau da solução:** construção mínima sobre a estrutura `Oportunidades` da SPEC-1-001 — validações determinísticas locais, sem consulta cadastral, IA decisora ou heurística não aprovada.

## Contexto e decisões fechadas

- **Estado atual:** dados chegam incompletos ou dispersos; a análise de CNPJ, colaboradores e Grau de Risco é manual (`02-Reuniao/Sales Call/03-fluxos_encontrados.md`). A política de duplicidade não está formalizada.
- **Estado desejado:** o registro informa o campo impeditivo, permanece `pendente` quando incompleto, segue para `em classificação` somente quando os campos mínimos estão presentes e sinaliza coincidência exata sem apagar a origem.
- **Decisões já fechadas:** Fase 1 não consulta cadastro, não decide atividade real/Grau de Risco/preço e não gera proposta; duplicata suspeita não dispara contato; nenhuma transição para `enviada`, `aprovada` ou `perdida` ocorre automaticamente nesta fase.
- **Regra conservadora adotada para este contrato:** coincidência exata de CNPJ normalizado ou de inscrição rural normalizada sinaliza possível duplicidade; sem identificador confiável, o caso permanece `pendente`; não usar nome/telefone como prova automática de duplicidade.
- **Autorização deste run:** o solicitante autorizou a geração sem os demais aceites. A autorização não aprova a política de duplicidade para além da regra conservadora explicitada nem autoriza execução em produção sem acesso e responsável.
- **Bloqueios:** formato oficial da inscrição rural, alçada nominal para confirmar vínculo e plataforma final de execução não foram fornecidos. Não ampliar a regra nem excluir/vincular registros por suposição.

## Resultado observável

Uma demonstração cobre três casos: válido, incompleto e com identificador coincidente. O válido fica apto à classificação; o incompleto fica `pendente` com motivo; o coincidente é sinalizado e não cria nova cotação nem apaga a origem.

## Limites e dependências

- **Inclui:** presença e consistência mínima dos campos de Fase 1, estados iniciais, motivos de pendência, sinalização de coincidência exata, vínculo manual aprovado e histórico de correção.
- **Fora desta fase:** validação cadastral externa, confirmação da atividade real, Grau de Risco, motor de preço, proposta, importação da base `ESPERA`, deduplicação histórica completa, contato e follow-up.
- **Entradas e pré-condições:** registro criado pela SPEC-1-001; campos `razao_social_ou_nome`, `cnpj_ou_inscricao_rural`, `ramo`, `colaboradores`, `contato`, `origem`, `canal` e `responsavel` disponíveis para validação. Todos são obrigatórios para sair de `pendente`; o registro pode ser salvo incompleto para correção.
- **Saídas/artefatos:** estado e motivo atualizados na aba `Oportunidades`; evento de validação/pendência/duplicidade em `Eventos`; roteiro com os três casos.
- **Dependências e responsáveis:** SPEC-1-001; Comercial corrige dados; responsável designado confirma vínculo; Direção decide eventual alteração da política.
- **Atores e permissões mínimas:** Comercial pode corrigir e reenviar para validação; responsável designado pode confirmar vínculo; Direção consulta e aprova mudança de regra; ninguém exclui o registro original.
- **Superfícies/arquivos/configurações afetadas:** validações da aba `Oportunidades`, colunas de estado/motivo e aba `Eventos` descritas na SPEC-1-001.
- **Risco e plano B:** falso positivo pode atrasar a classificação; plano B é manter ambos como `pendente`, anexar a referência do registro relacionado e solicitar decisão humana, sem fusão destrutiva.
- **Rollback ou reversão:** desativar a regra nova, retornar o estado anterior preservando os eventos e exportar a lista de sinalizados; nenhuma exclusão ou fusão automática.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| `Oportunidades` → validação | registro da SPEC-1-001 | campos mínimos, `estado`, `motivo_estado`, `identificador_normalizado`, `registro_relacionado` | usuários autorizados na mesma planilha/superfície | reprocessar o mesmo registro não cria novo evento se o estado/motivo não mudou | manter estado anterior e registrar erro; não avançar |
| identificador → sinal de duplicidade | CNPJ ou inscrição rural informados no próprio conjunto operacional | normalização apenas de máscara/espaços; comparação exata; sem enriquecimento externo | acesso de leitura à própria estrutura | comparação idempotente por `oportunidade_id` e identificador | identificador ausente ou formato não reconhecido → `pendente`, motivo explícito |

**Proteções mínimas de dados e input:** tratar todos os campos como texto literal; não executar fórmula, script ou link recebido; não exportar nome, telefone ou e-mail para a lista de teste; manter somente o `oportunidade_id` e o motivo na evidência compartilhável; parar se a regra exigir acesso fora da superfície autorizada.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-1-004 | origem, canal, responsável, razão social/nome, CNPJ/inscrição rural, ramo, colaboradores e contato presentes | estado `em classificação`/`novo` conforme a configuração inicial, sem preço/proposta | qualquer campo ausente mantém `pendente` | Fase 1; RQ-002 |
| RN-1-005 | campo obrigatório de entrada ausente | estado `pendente`, `motivo_estado` com campo impeditivo e responsável pela correção | não substituir ausência por valor estimado | Fase 1; RQ-002 |
| RN-1-006 | CNPJ/inscrição normalizado coincide exatamente com registro existente | sinalizar `possível duplicidade`, manter origem e bloquear nova cotação até confirmação | sem identificador confiável, não usar nome/telefone como decisão automática | Fase 1; RQ-001 |
| RN-1-007 | responsável confirma que o registro é o mesmo | vincular ao registro existente sem apagar o original e registrar decisão | conflito ou falso positivo mantém ambos `pendentes` | Fase 1; critério de duplicidade do escopo |

## Fluxo e regras

1. Ler o registro criado pela SPEC-1-001 e normalizar somente espaços/máscaras do identificador informado.
2. Conferir presença de origem, canal, responsável, ramo, colaboradores e contato; preservar o valor recebido.
3. Procurar coincidência exata do identificador dentro da estrutura operacional.
4. Se faltar campo impeditivo, definir `pendente` e registrar motivo.
5. Se houver coincidência exata, sinalizar duplicidade, vincular referência e impedir nova cotação até decisão humana.
6. Se não houver bloqueio, marcar o próximo estado permitido (`em classificação`) sem executar classificação técnica ou cálculo.
7. Registrar evento e deixar o registro pronto para a próxima fase.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | campos mínimos preenchidos, identificador único ou ainda não informado | caso segue para `em classificação`/`novo`, sem preço e com evento de validação | se a regra posterior exigir identificador, `pendente` com motivo |
| Limite | falta ramo, colaboradores, contato, origem, canal ou responsável | `pendente`, campo impeditivo visível e responsável pela correção | correção gera novo evento; não apagar a tentativa original |
| Duplicidade exata | mesmo CNPJ ou inscrição normalizada em dois registros | segundo caso sinalizado, sem nova cotação ou contato | responsável decide vincular ou manter separados; sem fusão automática |
| Ambiguidade | nome/telefone semelhantes, identificador ausente | não classificar como duplicata automática | manter `pendente` e encaminhar para conferência |
| Erro de regra | falha na comparação ou coluna indisponível | estado anterior preservado e erro registrado | exportar casos afetados e parar para correção |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC; SPEC-1-001; `02-Projeto/02-Escopo-Definitivo.md`, Fase 1 e seção 5.3; `03-Projeto/requisitos.md`, RQ-001 a RQ-003.
2. **Alterar somente:** validações locais, estados, motivos, sinalização exata e eventos descritos nesta SPEC.
3. **Não alterar:** consulta de CNPJ, tabela NR 04, preço, proposta, base avulsa, comunicação, heurísticas de nome/telefone, fusão ou exclusão.
4. **Executar nesta ordem:** validar campos; normalizar identificador; comparar coincidência exata; atualizar estado/motivo; registrar evento; demonstrar os três casos.
5. **Parar e pedir validação quando:** a regra exigir inscrição rural não definida; surgir necessidade de heurística; houver conflito entre responsáveis; ou alguém pedir apagar/fundir registros.
6. **Estado válido ao parar:** cada caso mantém origem e histórico; bloqueios são visíveis; nenhum caso pendente vira proposta ou contato.

## Checklist de execução

- [ ] campos mínimos e motivos de pendência configurados
- [ ] estado inicial e transições permitidas conferidos
- [ ] normalização limitada a máscara/espaços
- [ ] caso incompleto permanece pendente
- [ ] coincidência exata sinaliza duplicidade sem apagar origem
- [ ] sem identificador não há heurística automática
- [ ] eventos de validação, pendência e duplicidade exportados

## Critérios de aceite

- [ ] **CA-1-006:** caso com todos os campos mínimos presentes segue ao próximo estado permitido, sem avançar para preço/proposta.
- [ ] **CA-1-007:** caso sem qualquer campo mínimo definido permanece `pendente`, identifica o campo impeditivo e mantém responsável pela correção.
- [ ] **CA-1-008:** coincidência exata de CNPJ/inscrição normalizada é sinalizada, referencia o registro relacionado e não cria nova cotação automaticamente.
- [ ] **CA-1-009:** sem identificador confiável, nome/telefone semelhantes não são tratados como duplicidade automática.
- [ ] **CA-1-010:** correção, confirmação ou recusa da duplicidade mantém o registro original e gera evento com ator, data e motivo.

## TDD da SPEC

**Correspondência aceite→prova:** CA-1-006 e CA-1-007 são provados no GREEN; CA-1-008 no GREEN;
CA-1-009 na regressão; CA-1-010 na decisão humana e no evento de correção.

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | dados incompletos e identificador repetido antes da regra | inserir um caso sem ramo e dois casos com o mesmo CNPJ | não há motivo de pendência, sinalização nem bloqueio de nova cotação | export antes da configuração |
| GREEN | validar os três casos | executar a validação local e registrar a decisão humana do vínculo | incompleto fica pendente; repetido é sinalizado; caso único segue ao próximo estado sem preço/proposta | export dos registros/eventos e capturas |
| REFACTOR/REGRESSÃO | falso positivo, reprocessamento e rollback | inserir nomes/telefones semelhantes sem identificador; reprocessar; desativar a regra | nenhum falso positivo automático; nenhum evento duplicado sem mudança; histórico preservado no rollback | lista de casos, export pós-rollback e log do roteiro |

**Dados/fixtures:** três registros sintéticos: um válido, um sem ramo/contato e dois com o mesmo CNPJ de teste; não usar dados pessoais reais para testar duplicidade.
**Caminhos de erro obrigatórios:** campo ausente, identificador não reconhecido, coincidência exata, sem identificador, falso positivo e falha de coluna/permissão.
**Evidência exigida:** export `Oportunidades`/`Eventos` antes e depois, capturas dos motivos/estados e decisão humana de vínculo quando aplicável.

## Handoff e operação

- **Como demonstrar:** abrir três registros, mostrar campos impeditivos, executar a coincidência exata e confirmar que preço/proposta/comunicação não aparecem.
- **Como operar depois:** Comercial corrige pendências; responsável designado decide vínculo; Direção altera a regra somente mediante decisão registrada.
- **Como monitorar:** revisar pendentes por motivo e duplicidades sem decisão; conferir eventos sem ator/data.
- **Pendência conhecida:** política completa de duplicidade, inscrição rural e alçadas nominais permanecem abertas; esta SPEC usa apenas regra conservadora e reversível.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| `9231990b-8acd-4766-8adc-ba7d0ba7d467` | Preparar validações, estados e normalização conservadora | Comercial | SPEC-1-002 | Campos mínimos, motivos, estados e transições configurados; normalização limitada a máscara/espaços; sem heurística de nome/telefone. | Preparação do GREEN: campos, estados, normalização e comparação exata. | Esquema/configuração e tabela da regra de normalização. | Task `11851c12-3446-4360-b207-4aa1d997dc1b`; inscrição rural e alçada mantidas como pendência explícita quando não definidas. | Pendente |
| `971bc228-d172-425c-acfc-add42c954fc8` | Validar caso único e caso incompleto | Comercial | SPEC-1-002 | Caso completo segue ao estado permitido sem preço/proposta; incompleto fica `pendente` com campo impeditivo e responsável. | TDD GREEN: caso válido e incompleto. | Export `Oportunidades`/`Eventos`, capturas de estados e motivos. | Task `9231990b-8acd-4766-8adc-ba7d0ba7d467`; fixtures sem PII real. | Pendente |
| `c42f44fb-3b17-4793-ba2c-28a1e8bd130f` | Sinalizar duplicidade exata e rejeitar heurística | Responsável designado | SPEC-1-002 | Identificador exato sinaliza e referencia duplicidade; sem identificador não há decisão automática por nome/telefone. | TDD GREEN e REFACTOR/REGRESSÃO para falso positivo. | Fixtures, exports e capturas sem PII compartilhável. | Task `9231990b-8acd-4766-8adc-ba7d0ba7d467`; identificador de teste/autorizado. | Pendente |
| `e9a6cc5d-741c-4a90-ba37-99bd438fdb4d` | Registrar decisão humana e rollback de duplicidade | Responsável designado | SPEC-1-002 | Confirmação/recusa preserva original e cria evento com ator, data e motivo; reprocessamento sem mudança não duplica evento. | TDD GREEN da decisão e REFACTOR/REGRESSÃO de reprocessamento/rollback. | Decisão, evento, exports antes/depois e log de rollback. | Task `c42f44fb-3b17-4793-ba2c-28a1e8bd130f`; responsável disponível; sem fusão destrutiva. | Pendente |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
