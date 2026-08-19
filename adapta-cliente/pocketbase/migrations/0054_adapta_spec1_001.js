// Migração 0054: adapta leads para SPEC-1-001 — campos canônais + estados novos
// Campos novos: canal, responsavel, colaboradores, motivo_estado
// Estados novos em status: pendente, em_classificacao
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // --- Campos novos ---
    if (!col.fields.getByName('canal')) {
      col.fields.add(
        new SelectField({
          name: 'canal',
          values: ['agendamento', 'whatsapp', 'formulario', 'indicacao', 'outro'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('responsavel')) {
      col.fields.add(new TextField({ name: 'responsavel' }))
    }
    if (!col.fields.getByName('colaboradores')) {
      col.fields.add(new NumberField({ name: 'colaboradores', required: false }))
    }
    if (!col.fields.getByName('motivo_estado')) {
      col.fields.add(new TextField({ name: 'motivo_estado' }))
    }

    // --- Estados novos no campo status ---
    const statusField = col.fields.getByName('status')
    if (statusField && statusField.type === 'select') {
      const existentes = statusField.values || []
      const novos = ['pendente', 'em_classificacao']
      for (const n of novos) {
        if (!existentes.includes(n)) {
          existentes.push(n)
        }
      }
      statusField.values = existentes
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    const campos = ['canal', 'responsavel', 'colaboradores', 'motivo_estado']
    for (const nome of campos) {
      const f = col.fields.getByName(nome)
      if (f) col.fields.removeByName(nome)
    }
    // Reverter status para os valores originais
    const statusField = col.fields.getByName('status')
    if (statusField && statusField.type === 'select') {
      statusField.values = (statusField.values || []).filter(
        (v) => !['pendente', 'em_classificacao'].includes(v),
      )
    }
    app.save(col)
  },
)
