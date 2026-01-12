import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Curso from '#models/curso'
import Grado from '#models/grado'
import Institucion from '#models/institucion'
import Usuario from '#models/usuario'

export default class Docente extends BaseModel {
  static table = 'docentes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombres: string

  @column()
  declare apellidos: string

  @column({ columnName: 'tipo_documento' })
  declare tipoDocumento: string

  @column({ columnName: 'numero_documento' })
  declare numeroDocumento: string

  @column()
  declare telefono: string

  @column({ columnName: 'telefono_emergencia' })
  declare telefonoEmergencia: string | null

  @column({ columnName: 'persona_emergencia' })
  declare personaEmergencia: string | null

  @column()
  declare correo: string

  @column()
  declare direccion: string | null

  @column({ columnName: 'es_director_grado' })
  declare esDirectorGrado: boolean

  @column({ columnName: 'grado_asignado' })
  declare gradoAsignado: number | null

  @column({ columnName: 'area_que_orienta' })
  declare areaQueOrienta: string | null

  @column({ columnName: 'centro_interes' })
  declare centroInteres: string | null

  @column({ columnName: 'institucion_id' })
  declare institucionId: number

  @column({ columnName: 'usuario_id' })
  declare usuarioId: number

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @belongsTo(() => Usuario, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof Usuario>

  @belongsTo(() => Grado, {
    foreignKey: 'gradoAsignado',
  })
  declare grado: BelongsTo<typeof Grado>

  @hasMany(() => Asignacion, {
    foreignKey: 'docenteId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @hasMany(() => Calificacion, {
    foreignKey: 'calificadoPor',
  })
  declare calificacionesRealizadas: HasMany<typeof Calificacion>

  @manyToMany(() => Curso, {
    pivotTable: 'docente_curso',
    pivotForeignKey: 'docente_id',
    pivotRelatedForeignKey: 'curso_id',
    pivotColumns: ['es_director', 'creado_en'],
  })
  declare cursos: ManyToMany<typeof Curso>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}