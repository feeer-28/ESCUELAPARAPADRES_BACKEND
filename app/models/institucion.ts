import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Auditoria from '#models/auditoria'
import Calificacion from '#models/calificacion'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Municipio from '#models/municipio'
import Notificacion from '#models/notificacion'
import Periodo from '#models/periodo'

export default class Institucion extends BaseModel {
  static table = 'instituciones'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare telefono: string | null

  @column()
  declare correo: string | null

  @column()
  declare direccion: string | null

  @column()
  declare naturaleza: string

  @column({ columnName: 'municipio_id' })
  declare municipioId: number

  @belongsTo(() => Municipio, {
    foreignKey: 'municipioId',
  })
  declare municipio: BelongsTo<typeof Municipio>

  @hasMany(() => Curso, {
    foreignKey: 'institucionId',
  })
  declare cursos: HasMany<typeof Curso>

  @hasMany(() => Periodo, {
    foreignKey: 'institucionId',
  })
  declare periodos: HasMany<typeof Periodo>

  @hasMany(() => Docente, {
    foreignKey: 'institucionId',
  })
  declare docentes: HasMany<typeof Docente>

  @hasMany(() => Asignacion, {
    foreignKey: 'institucionId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @hasMany(() => Entrega, {
    foreignKey: 'institucionId',
  })
  declare entregas: HasMany<typeof Entrega>

  @hasMany(() => Calificacion, {
    foreignKey: 'institucionId',
  })
  declare calificaciones: HasMany<typeof Calificacion>

  @hasMany(() => Notificacion, {
    foreignKey: 'institucionId',
  })
  declare notificaciones: HasMany<typeof Notificacion>

  @hasMany(() => Auditoria, {
    foreignKey: 'institucionId',
  })
  declare auditorias: HasMany<typeof Auditoria>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}