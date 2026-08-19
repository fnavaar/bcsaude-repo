# SPEC-1-001 — Entrada unificada de oportunidade e estado inicial

**Fase:** 1  
**Status:** planejada  
**Dono:** Direção comercial; execução operacional pelo Comercial  
**Origem no escopo:** Fase 1; RQ-001; RQ-002; RT-001; RT-006  
**Degrau da solução:** recurso nativo da plataforma — reuso de Google Forms/Sheets já presentes no fluxo, com registro manual para WhatsApp, sem API ou conector novo nesta fase.

## Contexto e decisões fechadas

- **Estado atual:** a entrada chega por WhatsApp ou Google Forms e é analisada manualmente pelo Comercial/Lady (`02-Reuniao/Kickoff Call/03-fluxos_encontrados.md`, `02-Reuniao/Sales Call/03-fluxos_encontrados.md`). A origem e o responsável não formam uma jornada única de medição.
- **Estado desejado:** cada oportunidade recebe um identificador, origem, canal, responsável, dados mínimos disponíveis, estado inicial e timestamps; o registro de WhatsApp entra manualmente na mesma estrutura do formulário.
- **Decisões já fechadas:** WhatsApp não terá disparo automático; o Comercial pode criar/corrigir; a Direção consulta; o Operador de dados não publica regra; toda alteração preserva usuário e data; nenhum registro avança para preço ou proposta nesta fase.
- **Autorização deste run:** o solicitante autorizou gerar as SPECs sem os demais aceites. Isso autoriza a redação e revisão deste contrato, mas não transforma `check-escopo.md` em aprovado nem autoriza publicação, conexão externa ou comunicação.
- **Bloqueios:** a conta/superfície exata do Google Forms/Sheets e o responsável nominal pela operação ainda não estão registrados. Se não houver acesso à superfície existente, parar antes de publicar ou alterar o fluxo.

## Resultado observável

Uma demonstração cria uma oportunidade válida por formulário e uma oportunidade recebida por WhatsApp registrada manualmente, ambas consultáveis na mesma estrutura, com origem, canal, responsável, estado e data de entrada. Nenhuma delas dispara comunicação nem cálculo de preço.

## Limites e dependências

- **Inclui:** formulário/registro manual, identificação da origem, canal, responsável, campos de entrada, estado inicial, identificador e histórico mínimo de alterações.
- **Fora desta fase:** consulta cadastral automática, Grau de Risco, cálculo de preço, geração de proposta, importação da base avulsa, comunicação, follow-up, handoff de contrato, CRM completo e substituição do sistema próprio.
- **Entradas e pré-condições:** demanda recebida por WhatsApp ou resposta do Google Forms; acesso de edição do Comercial à superfície definida; acesso de leitura da Direção.
- **Saídas/artefatos:** registro na aba/estrutura `Oportunidades`; linha de evento de entrada em `Eventos`; exportação demonstrável dos dois casos do roteiro.
- **Dependências e responsáveis:** Direção comercial confirma o responsável operacional e a superfície de trabalho; Comercial executa a entrada; consultor verifica o roteiro e a evidência.
- **Atores e permissões mínimas:** Comercial cria e corrige seus registros; Direção consulta; Operador de dados somente lê/importa quando autorizado; nenhum ator exclui registros ou publica regra. Se o Form aceitar respostas externas, somente a submissão pode ser externa; a planilha operacional e suas exportações permanecem restritas ao workspace autorizado.
- **Superfícies/arquivos/configurações afetadas:** Google Form de entrada, Google Sheet operacional com as abas `Oportunidades` e `Eventos`, e os registros manuais equivalentes. Se a equipe indicar outra superfície, parar e registrar emenda antes da alteração.
- **Risco e plano B:** perda de origem ou duplicação por entrada manual; plano B é exportar a resposta original e registrar manualmente com `origem=WhatsApp`, preservando a data e a mensagem de origem sem copiar conteúdo desnecessário.
- **Rollback ou reversão:** desativar o novo formulário/entrada, exportar `Oportunidades` e `Eventos`, preservar os registros originais e retornar ao fluxo manual sem apagar histórico.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Google Form → `Oportunidades` | resposta original do Form; para WhatsApp, registro manual feito pelo Comercial | `oportunidade_id`, `criado_em`, `atualizado_em`, `origem`, `canal`, `responsavel`, `razao_social_ou_nome`, `cnpj_ou_inscricao_rural`, `ramo`, `colaboradores`, `contato`, `email`, `telefone_whatsapp`, `comentarios`, `estado` | conta autorizada do workspace; Comercial com edição; Direção com leitura | resposta do Form usa seu identificador; entrada manual exige `oportunidade_id` único; não há retry de API | resposta incompleta é salva como `pendente`; falha de acesso interrompe a publicação e preserva a resposta original |
| Alteração de `Oportunidades` → `Eventos` | valor anterior e novo valor do registro | `evento_id`, `oportunidade_id`, `tipo_evento`, `ocorrido_em`, `ator`, `estado_anterior`, `estado_novo`, `motivo` | mesma superfície; somente usuários autorizados alteram oportunidades | uma linha por mudança confirmada; não duplicar evento ao recarregar a tela | se o evento não puder ser registrado, não declarar a alteração como concluída; exportar o registro para reconciliação |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-1-001 | entrada chega por Form ou WhatsApp | registrar `origem` e `canal` antes de salvar | origem desconhecida fica `pendente` e exige correção | Escopo definitivo, Fase 1; RQ-001 |
| RN-1-002 | registro criado ou corrigido | preservar ator, data e estado anterior | falha de auditoria interrompe a conclusão | Escopo definitivo, Fase 1 |
| RN-1-003 | demanda recebida por WhatsApp | Comercial cria registro manual na mesma estrutura | não obrigar o potencial cliente a preencher novamente nesta fase | `03-Projeto/01-Escopo.md:4.1–4.2`; Sales Call |

**Proteções mínimas de dados e input:** valores vindos de Form/WhatsApp são tratados como texto literal; não executar fórmulas, scripts ou links fornecidos no campo de comentários; não copiar a conversa completa para a planilha; usar fixtures sintéticas no TDD; manter CNPJ, telefone e e-mail somente na pasta/superfície autorizada; parar se o compartilhamento da planilha operacional precisar ser ampliado.

## Fluxo e regras

1. O Comercial abre o Form ou a estrutura de entrada manual.
2. Seleciona `origem` e `canal`; para WhatsApp, informa o registro mínimo sem copiar a conversa inteira.
3. Preenche os campos disponíveis e informa o responsável.
4. Salva o registro com `estado=novo` quando os campos mínimos estiverem presentes; caso contrário, salva `estado=pendente` com o campo ausente indicado.
5. Gera o evento de entrada e exibe o `oportunidade_id`.
6. A Direção consulta o registro e a evidência sem editar a regra nem enviar comunicação.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | resposta do Form com origem, canal, responsável e campos disponíveis | registro único em `Oportunidades`, estado inicial visível e evento de entrada | se o evento falhar, não concluir; exportar e reconciliar |
| WhatsApp manual | demanda sem resposta de Form | registro manual na mesma estrutura, `origem=WhatsApp`, canal e data preservados | se origem/responsável não forem informados, `pendente` |
| Limite | faltam CNPJ/inscrição, ramo, colaboradores ou contato | registro permanece consultável, estado `pendente` e campo impeditivo visível | não encaminhar para classificação, preço ou proposta |
| Falha de acesso | usuário sem permissão na superfície | nenhuma alteração parcial publicada | preservar a entrada original e parar para o responsável |
| Repetição | mesma resposta enviada novamente | não criar segundo registro automaticamente; encaminhar para SPEC-1-002 | vincular ao registro existente somente após confirmação do Comercial |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** `03-Projeto/02-Escopo-Definitivo.md`, seção Fase 1; `03-Projeto/requisitos.md`, RQ-001 e RQ-002; as duas fontes de fluxo citadas nesta SPEC; e esta SPEC inteira.
2. **Alterar somente:** a superfície de entrada autorizada, a estrutura `Oportunidades`/`Eventos` e os campos/estados descritos aqui.
3. **Não alterar:** regras de preço, consulta de CNPJ, NR 04, contatos da base avulsa, mensagens, follow-up, CRM, ERP ou qualquer integração externa.
4. **Executar nesta ordem:** confirmar acesso; criar/ajustar campos; testar entrada por Form; testar entrada manual de WhatsApp; conferir evento; exportar evidências.
5. **Parar e pedir validação quando:** a superfície/conta não for a existente; faltar permissão; for necessário criar conector/API; houver pedido de comunicação; ou a auditoria não puder ser preservada.
6. **Estado válido ao parar:** entradas originais preservadas; nenhum registro excluído; nenhum envio externo; registros já criados continuam consultáveis.

## Checklist de execução

- [ ] acesso e superfície de trabalho conferidos sem ampliar permissões
- [ ] campos, origem, canal, responsável e estados configurados
- [ ] caso válido por Form demonstrado
- [ ] caso de WhatsApp registrado manualmente na mesma estrutura
- [ ] evento de entrada e ator/data conferidos
- [ ] ausência de disparo, preço e integração externa comprovada
- [ ] exportação e roteiro de demonstração anexados à evidência da task

## Critérios de aceite

- [ ] **CA-1-001:** um caso válido criado pelo Form é consultável com `origem`, `canal`, `responsável`, `estado=novo` e `criado_em`.
- [ ] **CA-1-002:** um caso recebido por WhatsApp é registrado manualmente na mesma estrutura, sem exigir novo preenchimento do potencial cliente.
- [ ] **CA-1-003:** uma entrada incompleta permanece `pendente`, com o campo impeditivo visível e sem avanço para classificação, preço ou proposta.
- [ ] **CA-1-004:** cada criação e correção demonstrada mantém ator, data, estado anterior/novo e evento correspondente.
- [ ] **CA-1-005:** a demonstração comprova que nenhum fluxo desta SPEC envia comunicação ou cria integração externa.

## TDD da SPEC

**Correspondência aceite→prova:** CA-1-001 e CA-1-002 são provados no GREEN; CA-1-003 no cenário
de limite do GREEN; CA-1-004 no GREEN e na regressão; CA-1-005 na regressão e no rollback.

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | entrada sem jornada única | registrar um caso de Form e um de WhatsApp antes da configuração | não existe estrutura única com origem, responsável e evento comparáveis | captura/export do estado anterior |
| GREEN | criação dos dois tipos de entrada | enviar um caso válido pelo Form e registrar um caso WhatsApp com os mesmos campos mínimos | dois registros consultáveis, estados visíveis e eventos de entrada vinculados | export `Oportunidades`/`Eventos` e captura do roteiro |
| REFACTOR/REGRESSÃO | repetição, permissão e rollback | repetir a entrada; acessar com perfil de consulta; desativar a nova entrada e exportar | não há duplicação automática, perfil de consulta não edita, export preserva histórico e nenhum envio ocorre | export pós-rollback, captura de permissões e log da demonstração |

**Dados/fixtures:** um caso válido fictício ou autorizado pela B&C, um caso real recebido por WhatsApp sem conteúdo sensível desnecessário e um caso incompleto; não usar dados pessoais em exemplos compartilhados fora da pasta do cliente.
**Caminhos de erro obrigatórios:** campo ausente, origem desconhecida, repetição de entrada, ausência de permissão e falha de auditoria.
**Evidência exigida:** export das abas `Oportunidades`/`Eventos`, capturas do caso válido e pendente, e roteiro de demonstração vinculado à task posterior.

## Handoff e operação

- **Como demonstrar:** criar um caso válido por Form, registrar um caso WhatsApp manual, abrir ambos e mostrar origem, responsável, estado e evento.
- **Como operar depois:** Comercial registra entradas e correções; Direção consulta; nenhuma alteração de regra é feita nesta SPEC.
- **Como monitorar:** revisar diariamente entradas sem origem/responsável e eventos sem ator/data.
- **Pendência conhecida:** conta/superfície exata, responsável nominal e aceite do check do cliente continuam pendentes; não ativar publicação externa até resolver.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| `11851c12-3446-4360-b207-4aa1d997dc1b` | Preparar entrada unificada e permissões | Comercial | SPEC-1-001 | Superfície, campos de `Oportunidades`/`Eventos` e permissões mínimas conferidos sem ampliar compartilhamento ou criar conector. | Preparação do GREEN: acesso, estrutura e perfis. | Conta/superfície, responsável, esquema dos campos e captura de permissões. | Conta/superfície e responsável confirmados; Comercial edita e Direção lê. | Pendente |
| `684d6c59-ea3b-4938-b5d2-884e638f4ee0` | Configurar e demonstrar entradas por Form e WhatsApp | Comercial | SPEC-1-001 | Caso válido do Form e caso de WhatsApp manual consultáveis na mesma estrutura com origem, canal, responsável, estado e evento. | TDD GREEN: criação dos dois tipos de entrada. | Export `Oportunidades`/`Eventos` e capturas do roteiro. | Task `11851c12-3446-4360-b207-4aa1d997dc1b`; fixtures autorizados ou sintéticos. | Pendente |
| `31965732-79a1-4900-b9cd-12dea55ccdd0` | Tratar entrada incompleta e repetição com auditoria | Comercial | SPEC-1-001 | Incompleto fica `pendente`; repetição não duplica; criação/correção preserva ator, data e estados. | Limite e repetição; TDD GREEN e REFACTOR/REGRESSÃO. | Exports antes/depois, motivo e eventos de auditoria. | Task `684d6c59-ea3b-4938-b5d2-884e638f4ee0`; fixtures de incompleto e repetição. | Pendente |
| `70550265-63e7-44b5-b94a-1a03e642f8ed` | Executar regressão, rollback e handoff da entrada | Consultor | SPEC-1-001 | Consulta não edita; rollback preserva histórico; nenhuma comunicação ou integração externa ocorre. | TDD REFACTOR/REGRESSÃO e Handoff e operação. | Export pós-rollback, permissões e roteiro de demonstração. | Tasks `684d6c59-ea3b-4938-b5d2-884e638f4ee0` e `31965732-79a1-4900-b9cd-12dea55ccdd0`. | Pendente |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
