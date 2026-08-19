// Hook: Importar leads avulsos do sistema de agendamento (Agendamento → Aurora B&C)
// MODELO NOVO: Conta em Potencial + Prospect + Lead
// ATUALIZADO (0054): adiciona campo canal='agendamento' em todos os leads importados
//
// Regras de comparação (especificação da CEO):
//   Mesma Conta + mesmo Prospect + mesmos dados → NÃO FAZ NADA
//   Mesma Conta + mesmo Prospect + email/telefone diferente → ALERTA no Lead p/ validar
//   Mesma Conta + novo Prospect → NOVO Lead em Execução
//   Nova Conta → NOVA Conta + Prospect + Lead
//
// Rota: POST /backend/v1/leads/import-agendamento
// Body (opcional): { semana_anterior?: boolean, data_inicio?, data_fim? }

routerAdd(
  'POST',
  '/backend/v1/leads/import-agendamento',
  (e) => {
    const body = e.requestInfo().body || {}
    const usuario = $secrets.get('AGENDAMENTOS_USER') || 'RAQUEL'
    const senha = $secrets.get('AGENDAMENTOS_PASS')

    const API_AGENDAMENTO = 'https://apibcsaude.com.br'
    const APP_AGENDAMENTO = 'https://agendamentos-five.vercel.app'

    const maskDoc = (doc) => {
      const d = (doc || '').replace(/\D/g, '')
      if (d.length === 14) {
        return (
          d.slice(0, 2) +
          '.' +
          d.slice(2, 5) +
          '.' +
          d.slice(5, 8) +
          '/' +
          d.slice(8, 12) +
          '-' +
          d.slice(12, 14)
        )
      }
      return doc || ''
    }

    // Normaliza nome para comparação (remove acentos, lowercase, trim, remove espaços extras)
    const normNome = (s) => {
      return (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Normaliza email/telefone para comparação (só dígitos p/ telefone, lowercase trim p/ email)
    const normTel = (s) => (s || '').replace(/\D/g, '')
    const normEmail = (s) => (s || '').toLowerCase().trim()

    const resumo = {
      total: 0,
      avulsos: 0,
      excluidos_contrato: 0,
      excluidos_edital: 0,
      unicos: 0,
      contas_criadas: 0,
      contas_existentes: 0,
      prospects_criados: 0,
      prospects_existentes: 0,
      leads_criados: 0,
      leads_ignorados: 0,
      leads_alerta: 0,
      por_tag: {},
    }

    try {
      // ---------- 1. Login ----------
      let token = ''
      try {
        const loginRes = $http.send({
          url: API_AGENDAMENTO + '/usuarios/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: usuario, senha: senha }),
          timeout: 20,
        })
        if (loginRes.statusCode === 200 && loginRes.json && loginRes.json.token) {
          token = loginRes.json.token
        } else {
          return e.json(502, {
            error: 'Falha no login do agendamento (HTTP ' + loginRes.statusCode + ')',
          })
        }
      } catch (err) {
        return e.json(502, { error: 'Falha no login: ' + (err && err.message ? err.message : err) })
      }

      // ---------- 2. Buscar agendamentos ----------
      let items = []
      try {
        const sess = $http.send({
          url: APP_AGENDAMENTO + '/api/admin/agendamentos?all=true',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: 'token=' + token + '; admin_session=' + token,
          },
          timeout: 60,
        })
        if (sess.statusCode === 200 && sess.json && Array.isArray(sess.json.items)) {
          items = sess.json.items
        } else {
          return e.json(502, {
            error: 'Falha ao buscar agendamentos (HTTP ' + sess.statusCode + ')',
          })
        }
      } catch (err) {
        return e.json(502, {
          error: 'Falha ao buscar agendamentos: ' + (err && err.message ? err.message : err),
        })
      }

      resumo.total = items.length

      // ---------- Janela de datas ----------
      let ini = null,
        fim = null
      if (body.semana_anterior !== false) {
        const hoje = new Date()
        const dow = (hoje.getDay() + 6) % 7
        const segEsta = new Date(hoje)
        segEsta.setDate(hoje.getDate() - dow)
        const segAnt = new Date(segEsta)
        segAnt.setDate(segEsta.getDate() - 7)
        const sabAnt = new Date(segAnt)
        sabAnt.setDate(segAnt.getDate() + 5)
        ini = segAnt.toISOString().slice(0, 10)
        fim = sabAnt.toISOString().slice(0, 10)
      }
      if (body.data_inicio) ini = String(body.data_inicio).slice(0, 10)
      if (body.data_fim) fim = String(body.data_fim).slice(0, 10)

      const noIntervalo = (dataStr) => {
        if (!ini || !fim) return true
        const d = (dataStr || '').slice(0, 10)
        return d >= ini && d <= fim
      }

      // ---------- 3. Filtrar Avulsos ----------
      const ehAvulso = (i) => {
        const conv = String(i.convenio || i.statusPagamento || '').toUpperCase()
        return conv.includes('AVULSO')
      }
      const ehKit = (i) => {
        const perfil = String(i.perfilContratante || '').toUpperCase()
        const obs = String(i.observacoes || '').toUpperCase()
        const kitFile = String(i.kit_file || '')
        return perfil.includes('KIT') || obs.includes('KIT') || kitFile.length > 0
      }
      const ehContrato = (i) => {
        const conv = String(i.convenio || i.statusPagamento || '').toUpperCase()
        return (
          conv.includes('CONTRATO') ||
          conv.includes('COORDENADA') ||
          conv.includes('ESOCIAL') ||
          conv.includes('FATURADO')
        )
      }
      const ehEdital = (i) => {
        const emp = String(i.nome_empresa || '').toUpperCase()
        const perfil = String(i.perfilContratante || '').toUpperCase()
        return (
          emp.includes('EDITAL') ||
          emp.includes('CONCURSO') ||
          perfil.includes('EDITAL') ||
          perfil.includes('CONCURSO')
        )
      }

      const avulsos = items.filter((i) => noIntervalo(i.data) && ehAvulso(i))
      resumo.avulsos = avulsos.length
      const semContrato = avulsos.filter((i) => !ehContrato(i))
      resumo.excluidos_contrato = avulsos.length - semContrato.length
      const semEdital = semContrato.filter((i) => !ehEdital(i))
      resumo.excluidos_edital = semContrato.length - semEdital.length

      // ---------- 4. Agrupar por documento ----------
      const porDoc = new Map()
      for (const i of semEdital) {
        const doc = String(i.numero_documento || i.documento || '').replace(/\D/g, '')
        if (!doc || doc.length < 11) continue
        if (!porDoc.has(doc)) porDoc.set(doc, [])
        porDoc.get(doc).push(i)
      }
      resumo.unicos = porDoc.size

      // ---------- 5. Processar cada documento ----------
      const leadsColl = $app.findCollectionByNameOrId('leads')
      const contasColl = $app.findCollectionByNameOrId('contas')
      const prospectsColl = $app.findCollectionByNameOrId('prospects')
      const semRef = ini && fim ? ini + ' a ' + fim : 'todos'

      for (const [doc, regs] of porDoc.entries()) {
        const tag = regs.some((r) => ehKit(r)) ? 'AVULSO KIT' : 'AVULSO'
        const cnpjMasc = maskDoc(doc)

        // Dados do agendamento
        const razao = regs.map((r) => String(r.nome_empresa || '')).filter(Boolean)[0] || ''
        const contato =
          regs.map((r) => String(r.responsavel || r.nome || '')).filter(Boolean)[0] || ''
        const email =
          regs
            .map((r) => String(r.email_empresa || r.responsavelEmail || r.email || ''))
            .filter(Boolean)[0] || ''
        const tel = regs.map((r) => String(r.telefone || '')).filter(Boolean)[0] || ''
        const locaisSet = {}
        for (const r of regs) {
          const lc = String(r.local_unidade || r.local || '')
            .toUpperCase()
            .trim()
          if (lc) locaisSet[lc] = true
        }
        const local = Object.keys(locaisSet)[0] || ''
        const datas = regs
          .map((r) => String(r.data || '').slice(0, 10))
          .filter(Boolean)
          .sort()
        const dataMaisRecente = datas[datas.length - 1] || ''

        // ---- 5.1 Buscar ou criar CONTA ----
        let conta = null
        try {
          conta = $app.findFirstRecordByFilter('contas', 'cnpj = {:c}', { c: cnpjMasc })
        } catch (_) {
          conta = null
        }

        if (conta) {
          resumo.contas_existentes++
          // Corrige razão social se estava com CNPJ no campo
          if (!conta.getString('razao_social') || conta.getString('razao_social') === cnpjMasc) {
            if (razao) conta.set('razao_social', razao)
          }
          // Atualiza email/telefone da empresa se vazios
          if (!conta.getString('email_empresa') && email) conta.set('email_empresa', email)
          if (!conta.getString('telefone_empresa') && tel) conta.set('telefone_empresa', tel)
          try {
            $app.save(conta)
          } catch (_) {}
        } else {
          conta = new Record(contasColl)
          conta.set('cnpj', cnpjMasc)
          conta.set('razao_social', razao || cnpjMasc)
          conta.set('grau_risco', 'ausente')
          conta.set('status', 'novo')
          conta.set('nivel', 'a_classificar')
          if (email) conta.set('email_empresa', email)
          if (tel) conta.set('telefone_empresa', tel)
          conta.set('observacoes', 'Importado via Buscar Leads · semana ' + semRef)
          try {
            $app.save(conta)
            resumo.contas_criadas++
          } catch (err) {
            continue
          }
        }

        // ---- 5.2 Buscar ou criar PROSPECT ----
        const nomeNorm = normNome(contato)
        let prospect = null
        if (conta.id && nomeNorm) {
          // Busca prospect pelo nome normalizado dentro da conta
          const allProspects = $app.findRecordsByFilter('prospects', 'conta_id = {:cid}', {
            cid: conta.id,
          })
          for (const p of allProspects) {
            if (normNome(p.getString('nome')) === nomeNorm) {
              prospect = p
              break
            }
          }
        }

        if (prospect) {
          resumo.prospects_existentes++
          // ---- Comparar dados do prospect ----
          const emailAtual = prospect.getString('email') || ''
          const telAtual = prospect.getString('telefone_whatsapp') || ''
          const emailNovo = normEmail(email)
          const telNovo = normTel(tel)
          const emailMudou = emailNovo && normEmail(emailAtual) !== emailNovo
          const telMudou = telNovo && normTel(telAtual) !== telNovo

          if (emailMudou || telMudou) {
            // ---- ALERTA: dados do prospect mudaram ----
            // Verificar se já existe um lead ativo para este prospect
            let leadExistente = null
            try {
              leadExistente = $app.findFirstRecordByFilter(
                'leads',
                'prospect_id = {:pid} && status != "descartado"',
                { pid: prospect.id },
              )
            } catch (_) {
              leadExistente = null
            }

            if (leadExistente) {
              // Cria alerta no lead existente (NÃO substitui o dado automaticamente)
              leadExistente.set('alerta_alteracao', true)
              let detalhe = '⚠ Dados do Prospect atualizados — validar\n'
              detalhe += 'Prospect: ' + contato + '\n'
              if (emailMudou) {
                detalhe += 'Campo: E-mail\nAnterior: ' + emailAtual + '\nNovo: ' + email + '\n'
                leadExistente.set('email_anterior', emailAtual)
              }
              if (telMudou) {
                detalhe += 'Campo: WhatsApp\nAnterior: ' + telAtual + '\nNovo: ' + tel + '\n'
                leadExistente.set('telefone_anterior', telAtual)
              }
              leadExistente.set('alerta_detalhe', detalhe)
              try {
                $app.save(leadExistente)
              } catch (_) {}
              resumo.leads_alerta++
            } else {
              // Não há lead ativo — cria novo lead com o prospect
              const l = new Record(leadsColl)
              l.set('conta_id', conta.id)
              l.set('prospect_id', prospect.id)
              l.set('cnpj', cnpjMasc)
              l.set('razao_social', razao || conta.getString('razao_social') || '')
              l.set('nome_contato', contato)
              l.set('email', email)
              l.set('telefone', tel)
              l.set('origem_local', local)
              l.set('origem_sistema', 'agendamento')
              l.set('canal', 'agendamento') // ← NOVO (0054)
              l.set('responsavel', 'sistema') // ← NOVO (0054)
              l.set('data_agendamento', dataMaisRecente)
              l.set('tag_original', tag)
              l.set('status', 'novo')
              l.set('observacoes', 'Importado via Buscar Leads · semana ' + semRef)
              try {
                $app.save(l)
                resumo.leads_criados++
                resumo.por_tag[tag] = (resumo.por_tag[tag] || 0) + 1
              } catch (_) {}
            }
          } else {
            // ---- Mesmos dados: NÃO FAZ NADA ----
            resumo.leads_ignorados++
          }
        } else {
          // ---- NOVO PROSPECT ----
          prospect = new Record(prospectsColl)
          prospect.set('conta_id', conta.id)
          prospect.set('nome', contato || 'Sem nome')
          prospect.set('email', email)
          prospect.set('telefone_whatsapp', tel)
          prospect.set('origem', 'agendamento')
          prospect.set('data_identificacao', dataMaisRecente)
          prospect.set('status', 'novo')
          try {
            $app.save(prospect)
            resumo.prospects_criados++
          } catch (_) {
            continue
          }

          // ---- NOVO LEAD ----
          // Verificar se já existe lead para este prospect
          let leadExistente = null
          try {
            leadExistente = $app.findFirstRecordByFilter('leads', 'prospect_id = {:pid}', {
              pid: prospect.id,
            })
          } catch (_) {
            leadExistente = null
          }

          if (!leadExistente) {
            const l = new Record(leadsColl)
            l.set('conta_id', conta.id)
            l.set('prospect_id', prospect.id)
            l.set('cnpj', cnpjMasc)
            l.set('razao_social', razao || conta.getString('razao_social') || '')
            l.set('nome_contato', contato)
            l.set('email', email)
            l.set('telefone', tel)
            l.set('origem_local', local)
            l.set('origem_sistema', 'agendamento')
            l.set('canal', 'agendamento') // ← NOVO (0054)
            l.set('responsavel', 'sistema') // ← NOVO (0054)
            l.set('data_agendamento', dataMaisRecente)
            l.set('tag_original', tag)
            l.set('status', 'novo')
            l.set('observacoes', 'Importado via Buscar Leads · semana ' + semRef)
            try {
              $app.save(l)
              resumo.leads_criados++
              resumo.por_tag[tag] = (resumo.por_tag[tag] || 0) + 1
            } catch (_) {}
          }
        }
      }

      // ---------- Evento de importação ----------
      try {
        const evColl = $app.findCollectionByNameOrId('lead_events')
        const ev = new Record(evColl)
        ev.set('tipo', 'importacao_agendamento')
        ev.set('data_evento', new Date().toISOString())
        ev.set('detalhe', 'Busca: ' + JSON.stringify(resumo))
        $app.save(ev)
      } catch (_) {}

      const resposta = { ok: true }
      resposta['total'] = resumo.total
      resposta['avulsos'] = resumo.avulsos
      resposta['excluidos_contrato'] = resumo.excluidos_contrato
      resposta['excluidos_edital'] = resumo.excluidos_edital
      resposta['unicos'] = resumo.unicos
      resposta['contas_criadas'] = resumo.contas_criadas
      resposta['contas_existentes'] = resumo.contas_existentes
      resposta['prospects_criados'] = resumo.prospects_criados
      resposta['prospects_existentes'] = resumo.prospects_existentes
      resposta['leads_criados'] = resumo.leads_criados
      resposta['leads_ignorados'] = resumo.leads_ignorados
      resposta['leads_alerta'] = resumo.leads_alerta
      resposta['por_tag'] = resumo.por_tag
      resposta['semana_referencia'] = semRef
      return e.json(200, resposta)
    } catch (err) {
      return e.json(500, { error: 'Erro interno: ' + (err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
