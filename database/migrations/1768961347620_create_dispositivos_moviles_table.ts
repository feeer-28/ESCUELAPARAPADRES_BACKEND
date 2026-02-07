import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dispositivos_moviles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Relación con usuario
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      
      // Información del dispositivo
      table.string('token_fcm', 255).notNullable().unique() // Token de Firebase
      table.string('plataforma', 20).notNullable() // android, ios
      table.string('version_app', 50).nullable()
      
      // Control
      table.boolean('activo').defaultTo(true)
      table.timestamp('creado_en').defaultTo(this.now())
      table.timestamp('actualizado_en').defaultTo(this.now())
      
      // Índices
      table.index(['usuario_id', 'activo'])
      table.index(['token_fcm'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
