import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dispositivos_moviles'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (hasTable) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      table.string('token_fcm', 255).notNullable().unique()
      table.string('dispositivo', 100).defaultTo('Desconocido')
      table.string('sistema_operativo', 50).defaultTo('Desconocido')
      table.string('version_app', 50).nullable()
      table.boolean('activo').defaultTo(true)
      table.timestamp('creado_en').defaultTo(this.now())
      table.timestamp('actualizado_en').defaultTo(this.now())
      table.index(['usuario_id', 'activo'])
      table.index(['token_fcm'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
