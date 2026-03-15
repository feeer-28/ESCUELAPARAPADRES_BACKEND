import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Usuario from '#models/usuario'

export default class DispositivoMovil extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare usuarioId: number

  @column()
  declare tokenFcm: string

  @column()
  declare plataforma: string

  @column()
  declare versionApp: string | null

  @column()
  declare activo: boolean

  @column.dateTime({ autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  // Relación con usuario
  @belongsTo(() => Usuario, {
    foreignKey: 'usuarioId'
  })
  declare usuario: BelongsTo<typeof Usuario>

  // Serialización
  serialize() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      tokenFcm: this.tokenFcm,
      plataforma: this.plataforma,
      versionApp: this.versionApp,
      activo: this.activo,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn
    }
  }
}
