import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones_push'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Destinatario y contenido
      table.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
      table.string('titulo', 255).notNullable()
      table.text('mensaje').notNullable()
      table.string('tipo', 50).notNullable().defaultTo('general') // tarea, evento, recordatorio, general
      table.integer('referencia_id').unsigned().nullable() // ID de tarea o evento
      table.string('referencia_tipo', 50).nullable() // 'evento', 'tarea'
      
      // Estado de envío
      table.boolean('leida').notNullable().defaultTo(false)
      table.boolean('enviada').notNullable().defaultTo(false)
      table.text('error_envio').nullable()
      
      // Timestamps
      table.timestamp('creada_en').notNullable().defaultTo(this.now())
      table.timestamp('enviada_en').nullable()
      table.timestamp('leida_en').nullable()
      
      // Índices
      table.index(['usuario_id', 'leida'])
      table.index(['tipo', 'enviada'])
      table.index(['creada_en'])
      table.index(['referencia_tipo', 'referencia_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
