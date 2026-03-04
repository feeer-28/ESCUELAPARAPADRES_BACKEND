import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import {
  BaseModel,
  belongsTo,
  column,
  hasMany,
  hasOne,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

import Role from '#models/role'
import Acudiente from '#models/acudiente'
import Auditoria from '#models/auditoria'
import BancoTarea from '#models/banco_tarea'
import Docente from '#models/docente'
import Funcionario from '#models/funcionario'
import Notificacion from '#models/notificacion'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['correo'],
  passwordColumnName: 'contrasenaHash',
})

export default class Usuario extends compose(BaseModel, AuthFinder) {
  static table = 'usuarios'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare correo: string

  @column({ columnName: 'contrasena_hash', serializeAs: null })
  declare contrasenaHash: string

  @column({ columnName: 'esta_activo' })
  declare estaActivo: boolean

  @column({ columnName: 'debe_cambiar_contrasena' })
  declare debeCambiarContrasena: boolean

  @column({ columnName: 'token_fcm' })
  declare tokenFcm: string | null

  @column.dateTime({ columnName: 'ultimo_ingreso' })
  declare ultimoIngreso: DateTime | null

  @column({ columnName: 'rol_id' })
  declare rolId: number

  @belongsTo(() => Role, {
    foreignKey: 'rolId',
  })
  declare rol: BelongsTo<typeof Role>

  @hasOne(() => Acudiente, {
    foreignKey: 'usuarioId',
  })
  declare acudiente: HasOne<typeof Acudiente>

  @hasOne(() => Docente, {
    foreignKey: 'usuarioId',
  })
  declare docente: HasOne<typeof Docente>

  @hasOne(() => Funcionario, {
    foreignKey: 'usuarioId',
  })
  declare funcionario: HasOne<typeof Funcionario>

  @hasMany(() => Auditoria, {
    foreignKey: 'usuarioId',
  })
  declare auditorias: HasMany<typeof Auditoria>

  @hasMany(() => Notificacion, {
    foreignKey: 'destinatarioId',
  })
  declare notificaciones: HasMany<typeof Notificacion>

  @hasMany(() => BancoTarea, {
    foreignKey: 'creadoPor',
  })
  declare bancoTareasCreadas: HasMany<typeof BancoTarea>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}