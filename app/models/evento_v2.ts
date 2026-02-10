import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Usuario from '#models/usuario'
import Institucion from '#models/institucion'
import NotificacionPush from '#models/notificacion_push'

export default class Evento extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare titulo: string

  @column()
  declare descripcion: string | null

  @column()
  declare tipoEvento: string

  @column.dateTime()
  declare fechaEvento: DateTime

  @column.dateTime()
  declare fechaRecordatorio: DateTime | null

  @column()
  declare institucionId: number

  @column()
  declare creadoPor: number

  @column()
  declare activo: boolean

  @column.dateTime({ autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  // Relaciones
  @belongsTo(() => Usuario, {
    foreignKey: 'creadoPor'
  })
  declare creador: BelongsTo<typeof Usuario>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId'
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => NotificacionPush, {
    foreignKey: 'referenciaId'
  })
  declare notificaciones: HasMany<typeof NotificacionPush>

  // Métodos de utilidad
  public static tiposEvento() {
    return [
      'reunion',
      'social', 
      'academico',
      'deportivo',
      'cultural',
      'otro'
    ]
  }

  public static eventosProximos(dias: number = 7) {
    const ahora = DateTime.now()
    const limite = ahora.plus({ days: dias })
    
    return this.query()
      .where('activo', true)
      .where('fecha_evento', '>=', ahora.toSQL())
      .where('fecha_evento', '<=', limite.toSQL())
      .orderBy('fecha_evento', 'asc')
  }

  public static eventosPorTipo(tipo: string) {
    return this.query()
      .where('activo', true)
      .where('tipo_evento', tipo)
      .orderBy('fecha_evento', 'asc')
  }

  // Serialización
  serialize() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      tipoEvento: this.tipoEvento,
      fechaEvento: this.fechaEvento,
      fechaRecordatorio: this.fechaRecordatorio,
      institucionId: this.institucionId,
      creadoPor: this.creadoPor,
      activo: this.activo,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn
    }
  }
}
