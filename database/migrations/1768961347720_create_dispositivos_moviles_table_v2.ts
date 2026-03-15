import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dispositivos_moviles'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (hasTable) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
      table.string('token_fcm', 255).notNullable().unique()
      table.string('plataforma', 20).notNullable()
      table.string('version_app', 50).nullable()
      table.string('modelo_dispositivo', 100).nullable()
      table.string('version_os', 50).nullable()
      table.boolean('activo').notNullable().defaultTo(true)
      table.timestamp('ultimo_uso').nullable()
      table.timestamp('creado_en').notNullable().defaultTo(this.now())
      table.timestamp('actualizado_en').notNullable().defaultTo(this.now())
      table.index(['usuario_id', 'activo'])
      table.index(['token_fcm'])
      table.index(['plataforma'])
      table.unique(['usuario_id', 'token_fcm'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
