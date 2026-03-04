
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

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

  async descargarArchivo({ params, response }: HttpContext) {
    const tarea = await BancoTarea.find(params.id)
    if (!tarea) {
      return response.notFound({ message: 'Tarea no encontrada' })
    }

    const enlace = String(tarea.enlace || '').trim()
    if (!enlace) {
      return response.notFound({ message: 'La tarea no tiene archivo asociado' })
    }

    // Este endpoint solo sirve archivos locales guardados en /public/uploads/...
    // Si el enlace es externo (http/https), no se puede descargar desde el servidor.
    if (/^https?:\/\//i.test(enlace)) {
      return response.badRequest({ message: 'El enlace de esta tarea es externo y no es un archivo del servidor' })
    }

    // Validar que sea un path esperado y que corresponda al ID de la tarea
    const expectedPrefix = `/uploads/tareas/${tarea.id}/`
    if (!enlace.startsWith(expectedPrefix)) {
      return response.badRequest({ message: 'El archivo asociado no tiene una ruta válida' })
    }

    const relativePath = enlace.replace(/^\//, '')
    const absolutePath = app.makePath('public', relativePath)

    if (!existsSync(absolutePath)) {
      return response.notFound({ message: 'El archivo no existe en el servidor' })
    }

    return response.download(absolutePath)
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

    const enlaceString = request.input('enlace')

    const extensionesPermitidas = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'mp4',
      'mov',
      'mkv',
      'avi',
      'mp3',
      'wav',
      'm4a',
    ]

    const archivoEnlace =
      request.file('enlace', { size: '50mb', extnames: extensionesPermitidas }) ||
      request.file('archivo', { size: '50mb', extnames: extensionesPermitidas }) ||
      request.file('file', { size: '50mb', extnames: extensionesPermitidas })

    const payload = {
      titulo: request.input('titulo'),
      descripcion: request.input('descripcion'),
      enlace: enlaceString ? String(enlaceString) : null,
      categoriaId: request.input('categoriaId') ?? request.input('categoria_id'),
      tema: request.input('tema'),
      entregableEsperado: request.input('entregableEsperado') ?? request.input('entregable_esperado'),
      gradosObjetivo: request.input('gradosObjetivo') ?? request.input('grados_objetivo'),
      esMultiGrado: Boolean(request.input('esMultiGrado') ?? request.input('es_multi_grado') ?? false),
      tipoCalificacion: request.input('tipoCalificacion') ?? request.input('tipo_calificacion') ?? 'cualitativa',
      criteriosAutomaticos: request.input('criteriosAutomaticos') ?? request.input('criterios_automaticos'),
      vecesUtilizada: 0,
      creadoPor: usuario.id,
    }

    if (!payload.titulo || !payload.descripcion || !payload.categoriaId) {
      return response.badRequest({ message: 'titulo, descripcion y categoriaId son requeridos' })
    }

    const categoria = await Categoria.find(payload.categoriaId)
    if (!categoria) {
      return response.badRequest({ message: 'La categoriaId no existe' })
    }

    if (archivoEnlace && !archivoEnlace.isValid) {
      return response.badRequest({
        message: 'El archivo no es válido',
        errors: archivoEnlace.errors,
      })
    }

    const tarea = await BancoTarea.create(payload)

    if (archivoEnlace) {
      const relativeFolder = `uploads/tareas/${tarea.id}`
      const absoluteFolder = app.makePath('public', relativeFolder)
      await mkdir(absoluteFolder, { recursive: true })

      const safeClientName = String(archivoEnlace.clientName || 'archivo')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 80)

      const name = `${Date.now()}_${safeClientName}`
      await archivoEnlace.move(absoluteFolder, { name })

      tarea.enlace = `/${relativeFolder}/${name}`
      await tarea.save()
    }

    return response.created(tarea)
  }
}
