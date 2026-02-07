import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dispositivos_moviles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Relación con usuario
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      
      // Token FCM
      table.string('token_fcm', 255).notNullable().unique()
      
      // Información del dispositivo
      table.string('dispositivo', 100).defaultTo('Desconocido')
      table.string('sistema_operativo', 50).defaultTo('Desconocido')
      table.string('version_app', 50).nullable()
      
      // Estado
      table.boolean('activo').defaultTo(true)
      
      // Timestamps
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
