import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Categoria from '#models/categoria'
import Institucion from '#models/institucion'
import Usuario from '#models/usuario'

export default class BancoTarea extends BaseModel {
  static table = 'banco_tareas'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare titulo: string

  @column()
  declare descripcion: string

  @column()
  declare enlace: string | null

  @column({ columnName: 'categoria_id' })
  declare categoriaId: number

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  @column({ columnName: 'creado_por' })
  declare creadoPor: number | null

  @column()
  declare tema: string | null

  @column({ columnName: 'entregable_esperado' })
  declare entregableEsperado: string | null

  @column({ columnName: 'grados_objetivo' })
  declare gradosObjetivo: any | null

  @column({ columnName: 'es_multi_grado' })
  declare esMultiGrado: boolean

  @column({ columnName: 'tipo_calificacion' })
  declare tipoCalificacion: string

  @column({ columnName: 'criterios_automaticos' })
  declare criteriosAutomaticos: any | null

  @column({ columnName: 'veces_utilizada' })
  declare vecesUtilizada: number

  @belongsTo(() => Categoria, {
    foreignKey: 'categoriaId',
  })
  declare categoria: BelongsTo<typeof Categoria>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @belongsTo(() => Usuario, {
    foreignKey: 'creadoPor',
  })
  declare creador: BelongsTo<typeof Usuario>

  @hasMany(() => Asignacion, {
    foreignKey: 'bancoTareaId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}