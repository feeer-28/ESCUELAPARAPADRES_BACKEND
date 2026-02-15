import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'eventos'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (hasTable) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('titulo', 255).notNullable()
      table.text('descripcion').nullable()
      table.string('tipo_evento', 50).notNullable().defaultTo('otro')
      table.timestamp('fecha_evento').notNullable()
      table.timestamp('fecha_recordatorio').nullable()
      table.integer('institucion_id').unsigned().notNullable().references('id').inTable('instituciones').onDelete('CASCADE')
      table.integer('creado_por').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
      table.boolean('activo').notNullable().defaultTo(true)
      table.timestamp('creado_en').notNullable().defaultTo(this.now())
      table.timestamp('actualizado_en').notNullable().defaultTo(this.now())
      table.index(['institucion_id', 'activo'])
      table.index(['fecha_evento'])
      table.index(['tipo_evento'])
      table.index(['creado_por'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
