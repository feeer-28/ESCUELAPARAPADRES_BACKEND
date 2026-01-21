import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Auditoria from '#models/auditoria'
import Calificacion from '#models/calificacion'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Funcionario from '#models/funcionario'
import Municipio from '#models/municipio'
import Notificacion from '#models/notificacion'
import Periodo from '#models/periodo'

export default class Institucion extends BaseModel {
  static table = 'instituciones'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare telefono: string | null

  @column()
  declare correo: string | null

  @column()
  declare direccion: string | null

  @column()
  declare naturaleza: string

  @column({ columnName: 'codigo_dane' })
  declare codigoDane: string | null

  @column()
  declare nit: string | null

  @column({ columnName: 'resolucion_aprobacion' })
  declare resolucionAprobacion: string | null

  @column({ columnName: 'niveles_educativos' })
  declare nivelesEducativos: unknown[]

  @column()
  declare modalidad: string | null

  @column({ columnName: 'jornadas' })
  declare jornadas: unknown[] | null

  @column({ columnName: 'telefono_principal' })
  declare telefonoPrincipal: string

  @column({ columnName: 'telefono_secretaria' })
  declare telefonoSecretaria: string | null

  @column({ columnName: 'correo_institucional' })
  declare correoInstitucional: string

  @column({ columnName: 'correo_rectoria' })
  declare correoRectoria: string | null

  @column({ columnName: 'sitio_web' })
  declare sitioWeb: string | null

  @column({ columnName: 'direccion_completa' })
  declare direccionCompleta: string | null

  @column()
  declare barrio: string | null

  @column()
  declare estrato: number | null

  @column({ columnName: 'coordenadas_gps' })
  declare coordenadasGps: string | null

  @column({ columnName: 'capacidad_estudiantes' })
  declare capacidadEstudiantes: number | null

  @column({ columnName: 'ano_fundacion' })
  declare anoFundacion: number | null

  @column({ columnName: 'enfoque_pedagogico' })
  declare enfoquePedagogico: string | null

  @column()
  declare confesional: boolean | null

  @column()
  declare religion: string | null

  @column({ columnName: 'rector_nombre' })
  declare rectorNombre: string | null

  @column({ columnName: 'rector_documento' })
  declare rectorDocumento: string | null

  @column({ columnName: 'rector_telefono' })
  declare rectorTelefono: string | null

  @column({ columnName: 'rector_correo' })
  declare rectorCorreo: string | null

  @column({ columnName: 'municipio_id' })
  declare municipioId: number

  @belongsTo(() => Municipio, {
    foreignKey: 'municipioId',
  })
  declare municipio: BelongsTo<typeof Municipio>

  @hasMany(() => Curso, {
    foreignKey: 'institucionId',
  })
  declare cursos: HasMany<typeof Curso>

  @hasMany(() => Periodo, {
    foreignKey: 'institucionId',
  })
  declare periodos: HasMany<typeof Periodo>

  @hasMany(() => Docente, {
    foreignKey: 'institucionId',
  })
  declare docentes: HasMany<typeof Docente>

  @hasMany(() => Funcionario, {
    foreignKey: 'institucionId',
  })
  declare funcionarios: HasMany<typeof Funcionario>

  @hasMany(() => Asignacion, {
    foreignKey: 'institucionId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @hasMany(() => Entrega, {
    foreignKey: 'institucionId',
  })
  declare entregas: HasMany<typeof Entrega>

  @hasMany(() => Calificacion, {
    foreignKey: 'institucionId',
  })
  declare calificaciones: HasMany<typeof Calificacion>

  @hasMany(() => Notificacion, {
    foreignKey: 'institucionId',
  })
  declare notificaciones: HasMany<typeof Notificacion>

  @hasMany(() => Auditoria, {
    foreignKey: 'institucionId',
  })
  declare auditorias: HasMany<typeof Auditoria>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}