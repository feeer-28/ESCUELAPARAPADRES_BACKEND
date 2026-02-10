import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Usuario from '#models/usuario'

export default class NotificacionPush extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare usuarioId: number

  @column()
  declare titulo: string

  @column()
  declare mensaje: string

  @column()
  declare tipo: string

  @column()
  declare referenciaId: number | null

  @column()
  declare leida: boolean

  @column()
  declare enviada: boolean

  @column.dateTime({ autoCreate: true })
  declare creadaEn: DateTime

  @column.dateTime()
  declare enviadaEn: DateTime | null

  @column.dateTime()
  declare leidaEn: DateTime | null

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
      titulo: this.titulo,
      mensaje: this.mensaje,
      tipo: this.tipo,
      referenciaId: this.referenciaId,
      leida: this.leida,
      enviada: this.enviada,
      creadaEn: this.creadaEn,
      enviadaEn: this.enviadaEn,
      leidaEn: this.leidaEn
    }
  }
}
