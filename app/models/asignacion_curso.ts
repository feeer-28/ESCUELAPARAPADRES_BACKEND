import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AsignacionCurso extends BaseModel {
  static table = 'asignacion_cursos'

  @column({ isPrimary: true, columnName: 'asignacion_id' })
  declare asignacionId: number

  @column({ isPrimary: true, columnName: 'curso_id' })
  declare cursoId: number

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime
}