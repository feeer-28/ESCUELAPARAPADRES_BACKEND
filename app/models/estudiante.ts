import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Acudiente from '#models/acudiente'
import Calificacion from '#models/calificacion'
import Curso from '#models/curso'
import Entrega from '#models/entrega'

export default class Estudiante extends BaseModel {
  static table = 'estudiantes'

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

  @column.date({ columnName: 'fecha_nacimiento' })
  declare fechaNacimiento: DateTime

  @column()
  declare sexo: string

  @column({ columnName: 'grupo_sanguineo' })
  declare grupoSanguineo: string | null

  @column()
  declare rh: string | null

  @column({ columnName: 'pais_nacimiento' })
  declare paisNacimiento: string | null

  @column({ columnName: 'ciudad_nacimiento' })
  declare ciudadNacimiento: string | null

  @column()
  declare estrato: number | null

  @column()
  declare etnia: string | null

  @column()
  declare eps: string | null

  @column()
  declare direccion: string | null

  @column()
  declare barrio: string | null

  @column()
  declare telefono: string | null

  @column({ columnName: 'correo' })
  declare correoElectronico: string | null

  @column({ columnName: 'discapacidad' })
  declare discapacidad: string | null

  @column({ columnName: 'medicamentos' })
  declare medicamentos: string | null

  @column({ columnName: 'alergias' })
  declare alergias: string | null

  @column({ columnName: 'enfermedades' })
  declare enfermedades: string | null

  @column({ columnName: 'curso_id' })
  declare cursoId: number

  @belongsTo(() => Curso, {
    foreignKey: 'cursoId',
  })
  declare curso: BelongsTo<typeof Curso>

  @hasMany(() => Entrega, {
    foreignKey: 'estudianteId',
  })
  declare entregas: HasMany<typeof Entrega>

  @hasMany(() => Calificacion, {
    foreignKey: 'estudianteId',
  })
  declare calificaciones: HasMany<typeof Calificacion>

  @manyToMany(() => Acudiente, {
    pivotTable: 'estudiante_acudiente',
    pivotForeignKey: 'estudiante_id',
    pivotRelatedForeignKey: 'acudiente_id',
    pivotColumns: ['relacion', 'es_principal', 'creado_en'],
  })
  declare acudientes: ManyToMany<typeof Acudiente>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}