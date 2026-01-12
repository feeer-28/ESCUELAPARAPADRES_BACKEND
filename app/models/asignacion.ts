import { DateTime } from 'luxon'
import {
  BaseModel,
  belongsTo,
  column,
  hasMany,
  manyToMany,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import BancoTarea from '#models/banco_tarea'
import Calificacion from '#models/calificacion'
import Categoria from '#models/categoria'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Institucion from '#models/institucion'
import Notificacion from '#models/notificacion'
import Periodo from '#models/periodo'

export default class Asignacion extends BaseModel {
  static table = 'asignaciones'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare titulo: string

  @column()
  declare descripcion: string

  @column()
  declare frecuencia: string

  @column.date({ columnName: 'fecha_inicio' })
  declare fechaInicio: DateTime

  @column.date({ columnName: 'fecha_vencimiento' })
  declare fechaVencimiento: DateTime | null

  @column({ columnName: 'incluir_en_boletin' })
  declare incluirEnBoletin: boolean

  @column({ columnName: 'curso_id' })
  declare cursoId: number | null

  @column({ columnName: 'docente_id' })
  declare docenteId: number

  @column({ columnName: 'categoria_id' })
  declare categoriaId: number | null

  @column({ columnName: 'banco_tarea_id' })
  declare bancoTareaId: number | null

  @column({ columnName: 'periodo_id' })
  declare periodoId: number

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  @column()
  declare tema: string | null

  @belongsTo(() => Curso, {
    foreignKey: 'cursoId',
  })
  declare curso: BelongsTo<typeof Curso>

  @manyToMany(() => Curso, {
    pivotTable: 'asignacion_cursos',
    pivotForeignKey: 'asignacion_id',
    pivotRelatedForeignKey: 'curso_id',
    pivotColumns: ['creado_en'],
  })
  declare cursos: ManyToMany<typeof Curso>

  @belongsTo(() => Docente, {
    foreignKey: 'docenteId',
  })
  declare docente: BelongsTo<typeof Docente>

  @belongsTo(() => Categoria, {
    foreignKey: 'categoriaId',
  })
  declare categoria: BelongsTo<typeof Categoria>

  @belongsTo(() => BancoTarea, {
    foreignKey: 'bancoTareaId',
  })
  declare bancoTarea: BelongsTo<typeof BancoTarea>

  @belongsTo(() => Periodo, {
    foreignKey: 'periodoId',
  })
  declare periodo: BelongsTo<typeof Periodo>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => Entrega, {
    foreignKey: 'asignacionId',
  })
  declare entregas: HasMany<typeof Entrega>

  @hasMany(() => Calificacion, {
    foreignKey: 'asignacionId',
  })
  declare calificaciones: HasMany<typeof Calificacion>

  @hasMany(() => Notificacion, {
    foreignKey: 'asignacionId',
  })
  declare notificaciones: HasMany<typeof Notificacion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}