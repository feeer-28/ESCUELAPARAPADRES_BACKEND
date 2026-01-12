import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Institucion from '#models/institucion'
import Periodo from '#models/periodo'

export default class Calificacion extends BaseModel {
  static table = 'calificaciones'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'entrega_id' })
  declare entregaId: number

  @column({ columnName: 'estudiante_id' })
  declare estudianteId: number

  @column({ columnName: 'asignacion_id' })
  declare asignacionId: number

  @column()
  declare nota: number | null

  @column()
  declare escala: string

  @column({ columnName: 'nota_cualitativa' })
  declare notaCualitativa: string | null

  @column()
  declare retroalimentacion: string | null

  @column({ columnName: 'calificado_por' })
  declare calificadoPor: number

  @column.dateTime({ columnName: 'calificado_en' })
  declare calificadoEn: DateTime

  @column({ columnName: 'periodo_id' })
  declare periodoId: number

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  @column({ columnName: 'es_automatica' })
  declare esAutomatica: boolean

  @belongsTo(() => Entrega, {
    foreignKey: 'entregaId',
  })
  declare entrega: BelongsTo<typeof Entrega>

  @belongsTo(() => Estudiante, {
    foreignKey: 'estudianteId',
  })
  declare estudiante: BelongsTo<typeof Estudiante>

  @belongsTo(() => Asignacion, {
    foreignKey: 'asignacionId',
  })
  declare asignacion: BelongsTo<typeof Asignacion>

  @belongsTo(() => Docente, {
    foreignKey: 'calificadoPor',
  })
  declare docente: BelongsTo<typeof Docente>

  @belongsTo(() => Periodo, {
    foreignKey: 'periodoId',
  })
  declare periodo: BelongsTo<typeof Periodo>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}