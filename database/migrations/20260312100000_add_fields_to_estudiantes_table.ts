import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'estudiantes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Datos de contacto y ubicación
      table.string('direccion').nullable()
      table.string('barrio').nullable()
      table.string('telefono').nullable()
      table.string('correo').nullable()
      
      // Datos médicos
      table.string('discapacidad').nullable()
      table.text('medicamentos').nullable()
      table.text('alergias').nullable()
      table.text('enfermedades').nullable()
      
      // Datos socioeconómicos
      table.string('pais_nacimiento').nullable().alter()
      table.string('ciudad_nacimiento').nullable().alter()
      table.integer('estrato').nullable().alter()
      table.string('etnia').nullable().alter()
      table.string('eps').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('direccion')
      table.dropColumn('barrio')
      table.dropColumn('telefono')
      table.dropColumn('correo')
      table.dropColumn('discapacidad')
      table.dropColumn('medicamentos')
      table.dropColumn('alergias')
      table.dropColumn('enfermedades')
    })
  }
}
