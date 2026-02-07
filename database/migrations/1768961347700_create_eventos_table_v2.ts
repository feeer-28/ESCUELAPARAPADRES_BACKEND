import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'eventos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Información básica del evento
      table.string('titulo', 255).notNullable()
      table.text('descripcion').nullable()
      table.string('tipo_evento', 50).notNullable().defaultTo('otro') // reunion, social, academico, otro
      
      // Fechas importantes
      table.timestamp('fecha_evento').notNullable()
      table.timestamp('fecha_recordatorio').nullable()
      
      // Relaciones
      table.integer('institucion_id').unsigned().notNullable().references('id').inTable('instituciones').onDelete('CASCADE')
      table.integer('creado_por').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
      
      // Control
      table.boolean('activo').notNullable().defaultTo(true)
      table.timestamp('creado_en').notNullable().defaultTo(this.now())
      table.timestamp('actualizado_en').notNullable().defaultTo(this.now())
      
      // Índices para rendimiento
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
