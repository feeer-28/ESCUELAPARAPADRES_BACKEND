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
  declare modeloDispositivo: string | null

  @column()
  declare versionOs: string | null

  @column()
  declare activo: boolean

  @column.dateTime()
  declare ultimoUso: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  // Relación con usuario
  @belongsTo(() => Usuario, {
    foreignKey: 'usuarioId'
  })
  declare usuario: BelongsTo<typeof Usuario>

  // Métodos de utilidad
  public static plataformas() {
    return ['android', 'ios']
  }

  public static activosPorUsuario(usuarioId: number) {
    return this.query()
      .where('usuario_id', usuarioId)
      .where('activo', true)
      .orderBy('actualizado_en', 'desc')
  }

  public static porToken(token: string) {
    return this.query()
      .where('token_fcm', token)
      .where('activo', true)
      .first()
  }

  public static tokensPorUsuarios(usuarioIds: number[]) {
    return this.query()
      .whereIn('usuario_id', usuarioIds)
      .where('activo', true)
      .select('token_fcm', 'usuario_id', 'plataforma')
  }

  public actualizarUso() {
    this.ultimoUso = DateTime.now()
    this.actualizadoEn = DateTime.now()
    return this.save()
  }

  public desactivar() {
    this.activo = false
    this.actualizadoEn = DateTime.now()
    return this.save()
  }

  // Serialización
  serialize() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      tokenFcm: this.tokenFcm,
      plataforma: this.plataforma,
      versionApp: this.versionApp,
      modeloDispositivo: this.modeloDispositivo,
      versionOs: this.versionOs,
      activo: this.activo,
      ultimoUso: this.ultimoUso,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn
    }
  }
}
