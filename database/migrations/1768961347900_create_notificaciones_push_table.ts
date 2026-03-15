import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones_push'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (hasTable) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      table.string('titulo', 255).notNullable()
      table.text('cuerpo').notNullable()
      table.string('tipo', 50).defaultTo('general')
      table.text('datos').nullable()
      table.boolean('leida').defaultTo(false)
      table.timestamp('leida_en').nullable()
      table.timestamp('creada_en').defaultTo(this.now())
      table.index(['usuario_id', 'leida'])
      table.index(['usuario_id', 'creada_en'])
      table.index(['tipo'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
