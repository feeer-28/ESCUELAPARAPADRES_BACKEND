import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Estudiante from '#models/estudiante'
import Institucion from '#models/institucion'

export default class Entrega extends BaseModel {
  static table = 'entregas'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'asignacion_id' })
  declare asignacionId: number

  @column({ columnName: 'estudiante_id' })
  declare estudianteId: number

  @column({ columnName: 'acudiente_id' })
  declare acudienteId: number

  @column({ columnName: 'evidencia_texto' })
  declare evidenciaTexto: string | null

  @column({ columnName: 'archivos_url' })
  declare archivosUrl: any | null

  @column.dateTime({ columnName: 'fecha_entrega' })
  declare fechaEntrega: DateTime

  @column()
  declare estado: string

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  @column({ columnName: 'nombre_envio' })
  declare nombreEnvio: string | null

  @belongsTo(() => Asignacion, {
    foreignKey: 'asignacionId',
  })
  declare asignacion: BelongsTo<typeof Asignacion>

  @belongsTo(() => Estudiante, {
    foreignKey: 'estudianteId',
  })
  declare estudiante: BelongsTo<typeof Estudiante>

  @belongsTo(() => Acudiente, {
    foreignKey: 'acudienteId',
  })
  declare acudiente: BelongsTo<typeof Acudiente>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasOne(() => Calificacion, {
    foreignKey: 'entregaId',
  })
  declare calificacion: HasOne<typeof Calificacion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}