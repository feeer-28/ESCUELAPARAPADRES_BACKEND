import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

import BancoTarea from '#models/banco_tarea'
import Categoria from '#models/categoria'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class TareasController {
  async index({ response, jwtUser }: HttpContext) {
    console.log('=== DEBUG LISTAR TAREAS ===')
    console.log('👤 JWT User ID:', jwtUser?.id)
    console.log('👤 JWT User Rol:', jwtUser?.rolId)

    if (!jwtUser) {
      console.log('❌ Usuario no autenticado')
      return response.unauthorized({ message: 'No autenticado' })
    }

    // 🔥 OBTENER TODAS LAS TAREAS DE TODAS LAS INSTITUCIONES
    // Sin filtrar por institución
    const tareas = await BancoTarea.query()
      .preload('institucion')
      .preload('categoria')
      .preload('creador')
      .orderBy('id', 'desc')

    console.log('📋 Total tareas encontradas (todas las instituciones):', tareas.length)
    console.log('=== FIN DEBUG LISTAR TAREAS ===')

    return response.ok({
      success: true,
      data: tareas,
      total: tareas.length
    })
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

    if (/^https?:\/\//i.test(enlace)) {
      return response.badRequest({ message: 'El enlace de esta tarea es externo y no es un archivo del servidor' })
    }

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

    console.log('=== DEBUG CREAR TAREA ===')
    console.log('👤 JWT User ID:', usuario.id)
    console.log('👤 JWT User Rol:', usuario.rolId)
    console.log('👤 JWT User Email:', usuario.correo)

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      console.log('❌ Usuario sin permiso para crear tareas:', nombreRol)
      return response.forbidden({ message: 'No tienes permiso para crear tareas' })
    }

    console.log('✅ Usuario con permiso para crear tareas:', nombreRol)

    // Obtener institución del usuario
    let institucionId: number | null = null
    let institucionNombre: string = 'No asignada'

    try {
      const funcionario = await Funcionario.query()
        .where('usuario_id', usuario.id)
        .preload('institucion')
        .first()

      if (funcionario && funcionario.institucionId) {
        institucionId = funcionario.institucionId
        institucionNombre = funcionario.institucion?.nombre || 'Sin nombre'
        console.log('🏢 Institución encontrada:', {
          id: institucionId,
          nombre: institucionNombre
        })
      } else {
        console.log('⚠️ Usuario sin institución asignada')
        return response.badRequest({ 
          message: 'El usuario no tiene una institución asignada. No se puede crear la tarea.' 
        })
      }
    } catch (error) {
      console.error('❌ Error al obtener institución del usuario:', error)
      return response.internalServerError({ 
        message: 'Error al obtener la institución del usuario' 
      })
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
    ] as const

    const archivoEnlace =
      request.file('enlace', { size: '50mb', extnames: [...extensionesPermitidas] }) ||
      request.file('archivo', { size: '50mb', extnames: [...extensionesPermitidas] }) ||
      request.file('file', { size: '50mb', extnames: [...extensionesPermitidas] })

    console.log('DEBUG gradosObjetivo:', request.input('gradosObjetivo') ?? request.input('grados_objetivo'))
    console.log('DEBUG criteriosAutomaticos:', request.input('criteriosAutomaticos') ?? request.input('criterios_automaticos'))

    const payload = {
      titulo: request.input('titulo') as string,
      descripcion: request.input('descripcion') as string,
      enlace: enlaceString ? String(enlaceString) : null,
      categoriaId: (request.input('categoriaId') ?? request.input('categoria_id')) as number,
      tema: (request.input('tema') as string) ?? null,
      entregableEsperado: (request.input('entregableEsperado') ?? request.input('entregable_esperado')) as string | null,
      gradosObjetivo: (() => {
        const raw = request.input('gradosObjetivo') ?? request.input('grados_objetivo')
        if (raw === undefined || raw === null || raw === '') return null
        if (Array.isArray(raw)) return JSON.stringify(raw)
        const str = String(raw).trim()
        if (str.startsWith('[')) {
          try {
            const v = JSON.parse(str)
            return JSON.stringify(v)
          } catch {
            return null
          }
        }
        if (str.startsWith('{') && str.endsWith('}')) {
          const inner = str.slice(1, -1)
          const pgParts = inner.split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''))
          const numsPg = pgParts.map((x: string) => Number(x)).filter((n: number) => !Number.isNaN(n))
          const arr: Array<number | string> = numsPg.length ? numsPg : pgParts.filter((x: string) => x.length)
          return JSON.stringify(arr)
        }
        const parts = str
          .split(',')
          .map((x: string) => x.trim().replace(/^"|"$/g, ''))
          .filter((x: string) => x.length)
        const nums = parts.map((x: string) => Number(x)).filter((n: number) => !Number.isNaN(n))
        const arr: Array<number | string> = nums.length ? nums : parts
        return JSON.stringify(arr)
      })(),
      esMultiGrado: (() => {
        const v = request.input('esMultiGrado') ?? request.input('es_multi_grado')
        if (typeof v === 'boolean') return v
        if (v === undefined || v === null) return false
        const sv = String(v).toLowerCase()
        return sv === '1' || sv === 'true' || sv === 'yes' || sv === 'si'
      })(),
      tipoCalificacion: (request.input('tipoCalificacion') ?? request.input('tipo_calificacion') ?? 'cualitativa') as string,
      criteriosAutomaticos: (() => {
        const raw = request.input('criteriosAutomaticos') ?? request.input('criterios_automaticos')
        if (raw === undefined || raw === null || raw === '') return null
        if (typeof raw === 'object') return JSON.stringify(raw)
        const str = String(raw).trim()
        try {
          const v = JSON.parse(str)
          return JSON.stringify(v)
        } catch {
          return null
        }
      })(),
      vecesUtilizada: 0,
      creadoPor: usuario.id,
      institucionId: institucionId, // Agregamos la institución
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

    console.log('🎉 TAREA CREADA CON ÉXITO:')
    console.log('📋 Tarea ID:', tarea.id)
    console.log('📋 Tarea título:', tarea.titulo)
    console.log('📋 Tarea descripción:', tarea.descripcion.substring(0, 50) + '...')
    console.log('📋 Tarea categoría:', payload.categoriaId)
    console.log('🏢 Institución ID:', institucionId)
    console.log('🏢 Institución nombre:', institucionNombre)
    console.log('👤 Creado por ID:', usuario.id)
    console.log('👤 Creado por rol:', nombreRol)
    console.log('📅 Fecha creación:', new Date().toISOString())
    console.log('=== FIN DEBUG CREAR TAREA ===')

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
      
      console.log('📎 Archivo guardado:', tarea.enlace)
    }

    return response.created({
      success: true,
      message: 'Tarea creada exitosamente',
      data: {
        ...tarea.toJSON(),
        institucion: {
          id: institucionId,
          nombre: institucionNombre
        }
      }
    })
  }

  async update(ctx: HttpContext) {
    const { request, params, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      return response.forbidden({ message: 'No autorizado' })
    }

    const tarea = await BancoTarea.find(params.id)
    if (!tarea) {
      return response.notFound({ message: 'Tarea no encontrada' })
    }

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
    ] as const

    const archivoEnlace =
      request.file('enlace', { size: '50mb', extnames: [...extensionesPermitidas] }) ||
      request.file('archivo', { size: '50mb', extnames: [...extensionesPermitidas] }) ||
      request.file('file', { size: '50mb', extnames: [...extensionesPermitidas] })

    if (archivoEnlace && !archivoEnlace.isValid) {
      return response.badRequest({
        message: 'El archivo no es válido',
        errors: archivoEnlace.errors,
      })
    }

    const categoriaId = (request.input('categoriaId') ?? request.input('categoria_id')) as number | undefined
    if (categoriaId !== undefined) {
      const categoria = await Categoria.find(categoriaId)
      if (!categoria) {
        return response.badRequest({ message: 'La categoriaId no existe' })
      }
      tarea.categoriaId = categoriaId
    }

    const titulo = request.input('titulo') as string | undefined
    const descripcion = request.input('descripcion') as string | undefined
    const enlaceString = request.input('enlace') as string | undefined
    const tema = (request.input('tema') as string | null | undefined)
    const entregableEsperado = (request.input('entregableEsperado') ?? request.input('entregable_esperado')) as
      | string
      | null
      | undefined
    const gradosObjetivoRaw = request.input('gradosObjetivo') ?? request.input('grados_objetivo')
    const tipoCalificacion = (request.input('tipoCalificacion') ?? request.input('tipo_calificacion')) as
      | string
      | undefined
    const criteriosAutomaticosRaw = request.input('criteriosAutomaticos') ?? request.input('criterios_automaticos')

    if (titulo !== undefined) tarea.titulo = titulo
    if (descripcion !== undefined) tarea.descripcion = descripcion
    if (tema !== undefined) tarea.tema = tema
    if (entregableEsperado !== undefined) tarea.entregableEsperado = entregableEsperado
    if (tipoCalificacion !== undefined) tarea.tipoCalificacion = tipoCalificacion

    if (gradosObjetivoRaw !== undefined) {
      if (gradosObjetivoRaw === null || gradosObjetivoRaw === '') {
        tarea.gradosObjetivo = null
      } else if (Array.isArray(gradosObjetivoRaw)) {
        tarea.gradosObjetivo = JSON.stringify(gradosObjetivoRaw)
      } else {
        const s = String(gradosObjetivoRaw).trim()
        try {
          const v = JSON.parse(s)
          tarea.gradosObjetivo = JSON.stringify(v)
        } catch {
          const parts = s
            .split(',')
            .map((x: string) => x.trim().replace(/^"|"$/g, ''))
            .filter((x: string) => x.length)
          const nums = parts.map((x: string) => Number(x)).filter((n: number) => !Number.isNaN(n))
          const arr: Array<number | string> = nums.length ? nums : parts
          tarea.gradosObjetivo = JSON.stringify(arr)
        }
      }
    }

    if (criteriosAutomaticosRaw !== undefined) {
      if (criteriosAutomaticosRaw === null || criteriosAutomaticosRaw === '') {
        tarea.criteriosAutomaticos = null
      } else if (typeof criteriosAutomaticosRaw === 'object') {
        tarea.criteriosAutomaticos = JSON.stringify(criteriosAutomaticosRaw)
      } else {
        const s = String(criteriosAutomaticosRaw).trim()
        try {
          const v = JSON.parse(s)
          tarea.criteriosAutomaticos = JSON.stringify(v)
        } catch {
          tarea.criteriosAutomaticos = null
        }
      }
    }

    if (enlaceString !== undefined) {
      tarea.enlace = enlaceString ? String(enlaceString) : null
    }

    await tarea.save()

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

    return response.ok(tarea)
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      return response.forbidden({ message: 'No autorizado' })
    }

    const tarea = await BancoTarea.find(params.id)
    if (!tarea) {
      return response.notFound({ message: 'Tarea no encontrada' })
    }

    // Verificar referencias en asignaciones
    const refs = await (await import('@adonisjs/lucid/services/db')).default
      .from('asignaciones')
      .where('banco_tarea_id', tarea.id)
      .count('* as total')
    const total = Number(refs[0]?.total || 0)
    if (total > 0) {
      return response.conflict({
        message: 'No se puede eliminar: existen asignaciones que usan esta tarea',
        asignaciones: total,
      })
    }

    await tarea.delete()
    return response.ok({ success: true })
  }
}

