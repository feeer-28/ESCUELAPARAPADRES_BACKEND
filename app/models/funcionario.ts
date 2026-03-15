import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Institucion from '#models/institucion'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class Funcionario extends BaseModel {
  static table = 'funcionarios'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'nombre' })
  declare nombre: string

  @column({ columnName: 'apellido' })
  declare apellido: string

  @column()
  declare telefono: string | null

  @column({ columnName: 'correo_institucional' })
  declare correoInstitucional: string | null

  @column()
  declare direccion: string | null

  @column({ columnName: 'rol_id' })
  declare rolId: number

  @column({ columnName: 'usuario_id' })
  declare usuarioId: number

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  // Campos adicionales para coordinadores y otros funcionarios
  @column({ columnName: 'tipo_documento' })
  declare tipoDocumento: string | null

  @column({ columnName: 'numero_documento' })
  declare numeroDocumento: string | null

  @column({ columnName: 'area_que_orienta' })
  declare areaQueOrienta: string | null

  @column({ columnName: 'centro_interes' })
  declare centroInteres: string | null

  @belongsTo(() => Role, {
    foreignKey: 'rolId',
  })
  declare rol: BelongsTo<typeof Role>

  @belongsTo(() => Usuario, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof Usuario>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}