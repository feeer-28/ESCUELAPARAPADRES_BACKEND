import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Docente from '#models/docente'
import Estudiante from '#models/estudiante'
import Grado from '#models/grado'
import Institucion from '#models/institucion'

export default class Curso extends BaseModel {
  static table = 'cursos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column({ columnName: 'grado_id' })
  declare gradoId: number

  @column()
  declare jornada: string

  @column({ columnName: 'institucion_id' })
  declare institucionId: number

  @belongsTo(() => Grado, {
    foreignKey: 'gradoId',
  })
  declare grado: BelongsTo<typeof Grado>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => Estudiante, {
    foreignKey: 'cursoId',
  })
  declare estudiantes: HasMany<typeof Estudiante>

  @hasMany(() => Asignacion, {
    foreignKey: 'cursoId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @manyToMany(() => Docente, {
    pivotTable: 'docente_curso',
    pivotForeignKey: 'curso_id',
    pivotRelatedForeignKey: 'docente_id',
    pivotColumns: ['es_director', 'creado_en'],
  })
  declare docentes: ManyToMany<typeof Docente>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}