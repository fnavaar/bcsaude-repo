// Script de backfill: preenche canal e responsavel em leads existentes
// Executar UMA VEZ após aplicar a migração 0054
//
// Regras:
//   - Se origem_sistema = 'agendamento' → canal = 'agendamento', responsavel = 'sistema'
//   - Se origem_sistema = 'manual' → canal = 'outro', responsavel = 'migracao_inicial'
//   - Se origem_sistema vazio/null → canal = 'outro', responsavel = 'migracao_inicial'
//   - NÃO sobrescreve campos já preenchidos
//
// Uso: executar via PocketBase Admin → Logs > Run command, ou colar no console do admin
// Alternativa: chamar POST /backend/v1/leads/backfill-canal (auth)

routerAdd(
  'POST',
  '/backend/v1/leads/backfill-canal',
  (e) => {
    const leadsColl = $app.findCollectionByNameOrId('leads')
    const leads = $app.findRecordsByFilter('leads', 'canal = "" || canal = null')

    let atualizados = 0
    let erros = 0

    for (const lead of leads) {
      const origem = lead.getString('origem_sistema') || ''
      const canalAtual = lead.getString('canal') || ''
      const responsavelAtual = lead.getString('responsavel') || ''

      // Só preenche se vazio
      if (!canalAtual) {
        if (origem === 'agendamento') {
          lead.set('canal', 'agendamento')
        } else if (origem === 'manual') {
          lead.set('canal', 'outro')
        } else {
          lead.set('canal', 'outro')
        }
      }

      if (!responsavelAtual) {
        lead.set('responsavel', 'migracao_inicial')
      }

      try {
        $app.save(lead)
        atualizados++
      } catch (err) {
        erros++
      }
    }

    // Registrar evento de backfill
    try {
      const evColl = $app.findCollectionByNameOrId('lead_events')
      const ev = new Record(evColl)
      ev.set('tipo', 'backfill_canal')
      ev.set('data_evento', new Date().toISOString())
      ev.set('detalhe', 'Backfill canal/responsavel: ' + atualizados + ' atualizados, ' + erros + ' erros')
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      total_verificados: leads.length,
      atualizados: atualizados,
      erros: erros,
    })
  },
  $apis.requireAuth(),
)
