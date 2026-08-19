// Hook: Criar lead manual (WhatsApp / indicação / formulário externo)
// Adaptação da SPEC-1-001 — entrada unificada para o PocketBase
//
// Rota: POST /backend/v1/leads/manual (auth)
// Body: {
//   razao_social, cnpj, nome_contato, telefone, email,
//   canal (whatsapp|indicacao|formulario|outro),
//   responsavel, segmento, colaboradores, observacoes,
//   conta_id (opcional, liga a conta existente)
// }
//
// Regras:
//   - Campos obrigatórios: razao_social, cnpj, canal, responsavel
//   - Se faltar obrigatório → status=pendente, motivo_estado=Campo
//   - Se todos OK → status=novo
//   - CNPJ normalizado (só dígitos, máscara aplicada)
//   - Cria evento em lead_events com tipo='entrada_manual'
//   - Se conta_id informado, usa; senão, busca por CNPJ; senão, cria nova conta

routerAdd(
  'POST',
  '/backend/v1/leads/manual',
  (e) => {
    const body = e.requestInfo().body || {}

    // ---- Helpers ----
    const maskDoc = (doc) => {
      const d = (doc || '').replace(/\D/g, '')
      if (d.length === 14) {
        return (
          d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) +
          '/' + d.slice(8, 12) + '-' + d.slice(12, 14)
        )
      }
      return doc || ''
    }

    const normalizar = (s) => (s || '').replace(/\D/g, '')

    // ---- Validar campos obrigatórios ----
    const obrigatorios = {
      razao_social: 'Razão Social',
      cnpj: 'CNPJ',
      canal: 'Canal',
      responsavel: 'Responsável',
    }

    const camposFaltando = []
    for (const [campo, label] of Object.entries(obrigatorios)) {
      if (!body[campo] || String(body[campo]).trim() === '') {
        camposFaltando.push(label)
      }
    }

    // Validar canal válido
    const canaisValidos = ['agendamento', 'whatsapp', 'formulario', 'indicacao', 'outro']
    if (body.canal && !canaisValidos.includes(body.canal)) {
      return e.json(400, {
        error: 'Canal inválido. Valores aceitos: ' + canaisValidos.join(', '),
      })
    }

    // ---- Determinar status ----
    let status = 'novo'
    let motivoEstado = ''
    if (camposFaltando.length > 0) {
      status = 'pendente'
      motivoEstado = 'Campos obrigatórios ausentes: ' + camposFaltando.join(', ')
    }

    // ---- Normalizar CNPJ ----
    const cnpjNormalizado = normalizar(body.cnpj)
    const cnpjMascara = maskDoc(cnpjNormalizado)

    // ---- Buscar ou criar conta ----
    let contaId = body.conta_id || null
    if (!contaId && cnpjNormalizado.length === 14) {
      try {
        const existente = $app.findFirstRecordByFilter('contas', 'cnpj = {:c}', { c: cnpjMascara })
        if (existente) contaId = existente.id
      } catch (_) {}
    }

    if (!contaId) {
      try {
        const contasColl = $app.findCollectionByNameOrId('contas')
        const novaConta = new Record(contasColl)
        novaConta.set('cnpj', cnpjMascara)
        novaConta.set('razao_social', body.razao_social || cnpjMascara)
        if (body.segmento) novaConta.set('segmento', body.segmento)
        if (body.colaboradores) novaConta.set('funcionarios', body.colaboradores)
        novaConta.set('grau_risco', 'ausente')
        novaConta.set('status', 'novo')
        novaConta.set('nivel', 'a_classificar')
        novaConta.set('observacoes', 'Criado via entrada manual por ' + (body.responsavel || 'desconhecido'))
        $app.save(novaConta)
        contaId = novaConta.id
      } catch (err) {
        return e.json(500, { error: 'Falha ao criar conta: ' + (err.message || err) })
      }
    }

    // ---- Criar lead ----
    try {
      const leadsColl = $app.findCollectionByNameOrId('leads')
      const lead = new Record(leadsColl)

      lead.set('cnpj', cnpjMascara)
      lead.set('razao_social', body.razao_social || '')
      lead.set('nome_contato', body.nome_contato || '')
      lead.set('email', body.email || '')
      lead.set('telefone', body.telefone || '')
      lead.set('segmento', body.segmento || '')
      lead.set('canal', body.canal || 'outro')
      lead.set('responsavel', body.responsavel || '')
      lead.set('colaboradores', body.colaboradores || null)
      lead.set('origem_sistema', 'manual')
      lead.set('status', status)
      lead.set('motivo_estado', motivoEstado)
      lead.set('conta_id', contaId)
      if (body.observacoes) lead.set('observacoes', body.observacoes)

      $app.save(lead)

      // ---- Criar evento de entrada ----
      try {
        const evColl = $app.findCollectionByNameOrId('lead_events')
        const ev = new Record(evColl)
        ev.set('lead_id', lead.id)
        ev.set('tipo', 'entrada_manual')
        ev.set('data_evento', new Date().toISOString())
        ev.set('ator', body.responsavel || 'desconhecido')
        ev.set('estado_anterior', '')
        ev.set('estado_novo', status)
        ev.set('motivo', 'Entrada via ' + (body.canal || 'manual'))
        ev.set('detalhe', 'Lead criado manualmente por ' + (body.responsavel || 'desconhecido'))
        $app.save(ev)
      } catch (_) {
        // Evento é complementar; falha não impede criação do lead
      }

      return e.json(200, {
        ok: true,
        lead: {
          id: lead.id,
          razao_social: lead.getString('razao_social'),
          cnpj: lead.getString('cnpj'),
          canal: lead.getString('canal'),
          responsavel: lead.getString('responsavel'),
          status: lead.getString('status'),
          motivo_estado: lead.getString('motivo_estado'),
          conta_id: lead.getString('conta_id'),
        },
        campos_faltando: camposFaltando.length > 0 ? camposFaltando : null,
      })
    } catch (err) {
      return e.json(500, { error: 'Falha ao criar lead: ' + (err.message || err) })
    }
  },
  $apis.requireAuth(),
)
