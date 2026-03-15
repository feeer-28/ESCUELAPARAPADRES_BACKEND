import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Usuario from '#models/usuario'
import Institucion from '#models/institucion'

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

  // Relaciones
  @belongsTo(() => Usuario, {
    foreignKey: 'creadoPor'
  })
  declare creador: BelongsTo<typeof Usuario>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId'
  })
  declare institucion: BelongsTo<typeof Institucion>

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
      creadoEn: this.creadoEn
    }
  }
}
