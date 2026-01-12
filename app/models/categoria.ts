import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import BancoTarea from '#models/banco_tarea'

export default class Categoria extends BaseModel {
  static table = 'categorias'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare descripcion: string | null

  @column()
  declare color: string | null

  @column()
  declare icono: string | null

  @hasMany(() => BancoTarea, {
    foreignKey: 'categoriaId',
  })
  declare bancoTareas: HasMany<typeof BancoTarea>

  @hasMany(() => Asignacion, {
    foreignKey: 'categoriaId',
  })
  declare asignaciones: HasMany<typeof Asignacion>
}