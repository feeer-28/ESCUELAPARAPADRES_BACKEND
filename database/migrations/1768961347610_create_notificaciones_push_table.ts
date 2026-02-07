import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones_push'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Destinatario y contenido
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      table.string('titulo', 255).notNullable()
      table.text('mensaje').notNullable()
      table.string('tipo', 50).notNullable() // tarea, evento, recordatorio
      table.integer('referencia_id').unsigned().nullable() // ID de tarea o evento
      
      // Estado de envío
      table.boolean('leida').defaultTo(false)
      table.boolean('enviada').defaultTo(false)
      
      // Timestamps
      table.timestamp('creada_en').defaultTo(this.now())
      table.timestamp('enviada_en').nullable()
      table.timestamp('leida_en').nullable()
      
      // Índices
      table.index(['usuario_id', 'leida'])
      table.index(['tipo', 'enviada'])
      table.index(['creada_en'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
