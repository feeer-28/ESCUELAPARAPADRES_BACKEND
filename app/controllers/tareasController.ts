
import type { HttpContext } from '@adonisjs/core/http'

import BancoTarea from '#models/banco_tarea'
import Categoria from '#models/categoria'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class TareasController {
  async index({ response }: HttpContext) {
    const tareas = await BancoTarea.query().orderBy('id', 'desc')
    return response.ok(tareas)
  }

  async show({ params, response }: HttpContext) {
    const tarea = await BancoTarea.find(params.id)
    if (!tarea) {
      return response.notFound({ message: 'Tarea no encontrada' })
    }

    return response.ok(tarea)
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      return response.forbidden({ message: 'No tienes permiso para crear tareas' })
    }

    const payload = {
      titulo: request.input('titulo'),
      descripcion: request.input('descripcion'),
      enlace: request.input('enlace'),
      categoriaId: request.input('categoriaId') ?? request.input('categoria_id'),
      tema: request.input('tema'),
      entregableEsperado: request.input('entregableEsperado') ?? request.input('entregable_esperado'),
      gradosObjetivo: request.input('gradosObjetivo') ?? request.input('grados_objetivo'),
      esMultiGrado: Boolean(request.input('esMultiGrado') ?? request.input('es_multi_grado') ?? false),
      tipoCalificacion: request.input('tipoCalificacion') ?? request.input('tipo_calificacion') ?? 'cualitativa',
      criteriosAutomaticos: request.input('criteriosAutomaticos') ?? request.input('criterios_automaticos'),
      vecesUtilizada: 0,
      creadoPor: null,
    }

    if (!payload.titulo || !payload.descripcion || !payload.categoriaId) {
      return response.badRequest({ message: 'titulo, descripcion y categoriaId son requeridos' })
    }

    const categoria = await Categoria.find(payload.categoriaId)
    if (!categoria) {
      return response.badRequest({ message: 'La categoriaId no existe' })
    }

    const tarea = await BancoTarea.create(payload)
    return response.created(tarea)
  }
}
