import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Usuario from '#models/usuario'

export default class Acudiente extends BaseModel {
  static table = 'acudientes'

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

  @column({ columnName: 'telefono_alternativo' })
  declare telefonoAlternativo: string | null

  @column()
  declare correo: string | null

  @column()
  declare direccion: string | null

  @column()
  declare parentesco: string | null

  @column()
  declare ocupacion: string | null

  @column({ columnName: 'tipo_trabajo' })
  declare tipoTrabajo: string | null

  @column({ columnName: 'nivel_educativo' })
  declare nivelEducativo: string | null

  @column({ columnName: 'aporta_economia' })
  declare aportaEconomia: boolean | null

  @column({ columnName: 'horario_trabajo' })
  declare horarioTrabajo: string | null

  @column({ columnName: 'usuario_id' })
  declare usuarioId: number

  @belongsTo(() => Usuario, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof Usuario>

  @hasMany(() => Entrega, {
    foreignKey: 'acudienteId',
  })
  declare entregas: HasMany<typeof Entrega>

  @manyToMany(() => Estudiante, {
    pivotTable: 'estudiante_acudiente',
    pivotForeignKey: 'acudiente_id',
    pivotRelatedForeignKey: 'estudiante_id',
    pivotColumns: ['relacion', 'es_principal', 'creado_en'],
  })
  declare estudiantes: ManyToMany<typeof Estudiante>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}