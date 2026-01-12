import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class EstudianteAcudiente extends BaseModel {
  static table = 'estudiante_acudiente'

  @column({ isPrimary: true, columnName: 'estudiante_id' })
  declare estudianteId: number

  @column({ isPrimary: true, columnName: 'acudiente_id' })
  declare acudienteId: number

  @column()
  declare relacion: string

  @column({ columnName: 'es_principal' })
  declare esPrincipal: boolean

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime
}