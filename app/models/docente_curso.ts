import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DocenteCurso extends BaseModel {
  static table = 'docente_curso'

  @column({ isPrimary: true, columnName: 'docente_id' })
  declare docenteId: number

  @column({ isPrimary: true, columnName: 'curso_id' })
  declare cursoId: number

  @column({ columnName: 'es_director' })
  declare esDirector: boolean

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime
}