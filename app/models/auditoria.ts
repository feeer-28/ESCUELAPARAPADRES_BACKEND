import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Institucion from '#models/institucion'
import Usuario from '#models/usuario'

export default class Auditoria extends BaseModel {
  static table = 'auditoria'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'usuario_id' })
  declare usuarioId: number | null

  @column()
  declare accion: string

  @column()
  declare entidad: string

  @column({ columnName: 'entidad_id' })
  declare entidadId: number

  @column({ columnName: 'cambios_json' })
  declare cambiosJson: any | null

  @column({ columnName: 'direccion_ip' })
  declare direccionIp: string | null

  @column({ columnName: 'agente_usuario' })
  declare agenteUsuario: string | null

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

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
}