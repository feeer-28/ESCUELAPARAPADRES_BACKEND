import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateAsignacionEstudiantes extends BaseSchema {
  protected tableName = 'asignacion_estudiantes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('asignacion_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('asignaciones')
        .onDelete('CASCADE')
      table
        .integer('estudiante_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('estudiantes')
        .onDelete('CASCADE')

      table.unique(['asignacion_id', 'estudiante_id'])
      table.timestamp('creado_en', { useTz: true }).defaultTo(this.now())
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
