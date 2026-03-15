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
  declare referenciaTipo: string | null

  @column()
  declare leida: boolean

  @column()
  declare enviada: boolean

  @column()
  declare errorEnvio: string | null

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

  // Métodos de utilidad
  public static tiposNotificacion() {
    return [
      'tarea',
      'evento',
      'recordatorio',
      'general',
      'urgente'
    ]
  }

  public static noLeidas(usuarioId: number) {
    return this.query()
      .where('usuario_id', usuarioId)
      .where('leida', false)
      .orderBy('creada_en', 'desc')
  }

  public static porTipo(tipo: string, usuarioId?: number) {
    const query = this.query()
      .where('tipo', tipo)
      .orderBy('creada_en', 'desc')
    
    if (usuarioId) {
      query.where('usuario_id', usuarioId)
    }
    
    return query
  }

  public marcarComoLeida() {
    this.leida = true
    this.leidaEn = DateTime.now()
    return this.save()
  }

  public marcarComoEnviada() {
    this.enviada = true
    this.enviadaEn = DateTime.now()
    return this.save()
  }

  // Serialización
  serialize() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      titulo: this.titulo,
      mensaje: this.mensaje,
      tipo: this.tipo,
      referenciaId: this.referenciaId,
      referenciaTipo: this.referenciaTipo,
      leida: this.leida,
      enviada: this.enviada,
      errorEnvio: this.errorEnvio,
      creadaEn: this.creadaEn,
      enviadaEn: this.enviadaEn,
      leidaEn: this.leidaEn
    }
  }
}
