import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones_push'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Relación con usuario
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE')
      
      // Contenido de la notificación
      table.string('titulo', 255).notNullable()
      table.text('cuerpo').notNullable()
      table.string('tipo', 50).defaultTo('general') // tarea, evento, recordatorio, general, urgente
      
      // Datos adicionales (JSON)
      table.text('datos').nullable()
      
      // Estado
      table.boolean('leida').defaultTo(false)
      table.timestamp('leida_en').nullable()
      
      // Timestamps
      table.timestamp('creada_en').defaultTo(this.now())
      
      // Índices
      table.index(['usuario_id', 'leida'])
      table.index(['usuario_id', 'creada_en'])
      table.index(['tipo'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
