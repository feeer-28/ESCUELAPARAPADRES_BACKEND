import type { HttpContext } from '@adonisjs/core/http'

import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'



import Asignacion from '#models/asignacion'

import BancoTarea from '#models/banco_tarea'

import Categoria from '#models/categoria'

import Curso from '#models/curso'

import Docente from '#models/docente'

import Estudiante from '#models/estudiante'

import Periodo from '#models/periodo'

import Role from '#models/role'

import Usuario from '#models/usuario'

import MovilController from '#controllers/movilController'



export default class AsignacionesController {

  private async enviarNotificacionesAsignacion(asignacion: Asignacion, cursoIds: number[]) {
    try {
      const estudiantes = await Estudiante.query()
        .whereIn('curso_id', cursoIds)
        .preload('acudientes', (query) => {
          query.preload('usuario')
        })

      const acudienteUserIds = new Set<number>()
      estudiantes.forEach((estudiante) => {
        estudiante.acudientes.forEach((acudiente) => {
          if (acudiente.usuarioId) {
            acudienteUserIds.add(acudiente.usuarioId)
          }
        })
      })

      // Enviar notificación a cada padre (guarda en BD + envía push)
      for (const userId of acudienteUserIds) {
        await MovilController.enviarNotificacionPush(
          userId,
          '📚 Nueva Tarea Asignada',
          `Se ha asignado la tarea: ${asignacion.titulo}`,
          'tarea',
          {
            asignacion_id: asignacion.id,
            tipo: 'nueva_tarea',
            fecha_vencimiento: asignacion.fechaVencimiento?.toISO(),
          }
        )
      }

      console.log(`✅ Notificación de tarea enviada a ${acudienteUserIds.size} padres`)
    } catch (notifError) {
      console.error('Error al enviar notificaciones:', notifError)
    }
  }

  async storeOrientador(ctx: HttpContext) {
    const { request, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined

    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'orientador') {
      return response.forbidden({ message: 'No tienes permiso para asignar tareas como orientador' })
    }

    const bancoTareaId = request.input('bancoTareaId') ?? request.input('banco_tarea_id')
    const cursoId = request.input('cursoId') ?? request.input('curso_id')
    const cursoIds = request.input('cursoIds') ?? request.input('curso_ids')
    const periodoId = request.input('periodoId') ?? request.input('periodo_id')
    const fechaInicioRaw = request.input('fechaInicio') ?? request.input('fecha_inicio')
    const fechaVencimientoRaw = request.input('fechaVencimiento') ?? request.input('fecha_vencimiento')

    if (!bancoTareaId) {
      return response.badRequest({ message: 'bancoTareaId es requerido' })
    }

    if (!periodoId) {
      return response.badRequest({ message: 'periodoId es requerido' })
    }

    const ids: number[] = Array.isArray(cursoIds)
      ? cursoIds.map((id: any) => Number(id))
      : cursoId !== undefined && cursoId !== null
        ? [Number(cursoId)]
        : []

    if (!ids.length || ids.some((id) => Number.isNaN(id))) {
      return response.badRequest({ message: 'cursoId (o cursoIds) es requerido' })
    }

    const bancoTarea = await BancoTarea.find(bancoTareaId)
    if (!bancoTarea) {
      return response.badRequest({ message: 'La bancoTareaId no existe' })
    }

    const cursos = await Curso.query().whereIn('id', ids)
    if (cursos.length !== ids.length) {
      return response.badRequest({ message: 'Uno o más cursoIds no existen' })
    }

    const periodo = await Periodo.find(periodoId)
    if (!periodo) {
      return response.badRequest({ message: 'El periodoId no existe' })
    }

    const categoriaId = bancoTarea.categoriaId
    const categoria = await Categoria.find(categoriaId)
    if (!categoria) {
      return response.badRequest({ message: 'La categoriaId de la tarea no existe' })
    }

    const docenteRows = await db
      .from('docente_curso')
      .select('curso_id', 'docente_id', 'es_director', 'creado_en')
      .whereIn('curso_id', ids)
      .orderBy('es_director', 'desc')
      .orderBy('creado_en', 'asc')

    const docentePorCurso = new Map<number, number>()
    for (const row of docenteRows) {
      const curso = Number((row as any).curso_id)
      const docente = Number((row as any).docente_id)
      if (!docentePorCurso.has(curso)) {
        docentePorCurso.set(curso, docente)
      }
    }

    const faltantes = ids.filter((curso) => !docentePorCurso.has(curso))
    if (faltantes.length) {
      return response.badRequest({
        message: 'No hay docente asignado a uno o más cursos. Debes asignar un docente al curso.',
        cursosSinDocente: faltantes,
      })
    }

    const cursosPorDocente = new Map<number, number[]>()
    for (const curso of ids) {
      const docenteId = docentePorCurso.get(curso)!
      const list = cursosPorDocente.get(docenteId) ?? []
      list.push(curso)
      cursosPorDocente.set(docenteId, list)
    }

    const fechaInicio = fechaInicioRaw
      ? DateTime.fromISO(String(fechaInicioRaw))
      : DateTime.now().startOf('day')

    if (!fechaInicio.isValid) {
      return response.badRequest({ message: 'fechaInicio inválida (usa ISO: YYYY-MM-DD)' })
    }

    const fechaVencimiento = fechaVencimientoRaw ? DateTime.fromISO(String(fechaVencimientoRaw)) : null
    if (fechaVencimientoRaw && !fechaVencimiento?.isValid) {
      return response.badRequest({ message: 'fechaVencimiento inválida (usa ISO: YYYY-MM-DD)' })
    }

    const frecuencia = String(request.input('frecuencia') ?? 'unica')
    const incluirEnBoletin = Boolean(request.input('incluirEnBoletin') ?? request.input('incluir_en_boletin') ?? false)

    const asignacionesCreadas: Asignacion[] = []
    for (const [docenteId, cursosDelDocente] of cursosPorDocente.entries()) {
      const docente = await Docente.find(docenteId)
      if (!docente) {
        return response.badRequest({ message: 'El docente inferido no existe' })
      }

      const asignacion = await Asignacion.create({
        titulo: String(request.input('titulo') ?? bancoTarea.titulo),
        descripcion: String(request.input('descripcion') ?? bancoTarea.descripcion),
        frecuencia,
        fechaInicio,
        fechaVencimiento,
        incluirEnBoletin,
        cursoId: cursosDelDocente.length === 1 ? cursosDelDocente[0] : null,
        docenteId: docenteId,
        categoriaId,
        bancoTareaId: bancoTarea.id,
        periodoId: Number(periodoId),
        institucionId: request.input('institucionId') ?? request.input('institucion_id') ?? periodo.institucionId,
        tema: String(request.input('tema') ?? bancoTarea.tema ?? ''),
      })

      if (cursosDelDocente.length > 1) {
        await asignacion.related('cursos').attach(cursosDelDocente)
      }

      await this.enviarNotificacionesAsignacion(asignacion, cursosDelDocente)
      asignacionesCreadas.push(asignacion)
    }

    if (asignacionesCreadas.length === 1) {
      return response.created(asignacionesCreadas[0])
    }

    return response.created({
      asignaciones: asignacionesCreadas,
      total: asignacionesCreadas.length,
    })
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

      return response.forbidden({ message: 'No tienes permiso para asignar tareas' })

    }



    const bancoTareaId = request.input('bancoTareaId') ?? request.input('banco_tarea_id')

    const cursoId = request.input('cursoId') ?? request.input('curso_id')

    const cursoIds = request.input('cursoIds') ?? request.input('curso_ids')

    const periodoId = request.input('periodoId') ?? request.input('periodo_id')

    const fechaInicioRaw = request.input('fechaInicio') ?? request.input('fecha_inicio')

    const fechaVencimientoRaw = request.input('fechaVencimiento') ?? request.input('fecha_vencimiento')



    if (!bancoTareaId) {

      return response.badRequest({ message: 'bancoTareaId es requerido' })

    }



    if (!periodoId) {

      return response.badRequest({ message: 'periodoId es requerido' })

    }



    const ids: number[] = Array.isArray(cursoIds)

      ? cursoIds.map((id: any) => Number(id))

      : cursoId !== undefined && cursoId !== null

        ? [Number(cursoId)]

        : []



    if (!ids.length || ids.some((id) => Number.isNaN(id))) {

      return response.badRequest({ message: 'cursoId (o cursoIds) es requerido' })

    }



    const bancoTarea = await BancoTarea.find(bancoTareaId)

    if (!bancoTarea) {

      return response.badRequest({ message: 'La bancoTareaId no existe' })

    }



    const cursos = await Curso.query().whereIn('id', ids)

    if (cursos.length !== ids.length) {

      return response.badRequest({ message: 'Uno o más cursoIds no existen' })

    }



    const periodo = await Periodo.find(periodoId)

    if (!periodo) {

      return response.badRequest({ message: 'El periodoId no existe' })

    }



    const categoriaId = bancoTarea.categoriaId

    const categoria = await Categoria.find(categoriaId)

    if (!categoria) {

      return response.badRequest({ message: 'La categoriaId de la tarea no existe' })

    }



    let docenteId: number | null = null



    if (nombreRol === 'docente') {

      const docente = await Docente.query().where('usuario_id', usuario.id).first()

      if (!docente) {

        return response.badRequest({ message: 'No existe un docente asociado a este usuario' })

      }

      docenteId = docente.id

    } else {

      const docenteIdFromBody = request.input('docenteId') ?? request.input('docente_id')
      if (docenteIdFromBody !== undefined && docenteIdFromBody !== null && docenteIdFromBody !== '') {
        docenteId = Number(docenteIdFromBody)
        if (Number.isNaN(docenteId)) {
          return response.badRequest({ message: 'docenteId inválido' })
        }

        const docente = await Docente.find(docenteId)
        if (!docente) {
          return response.badRequest({ message: 'El docenteId no existe' })
        }
      } else {
        // Inferir docenteId desde el/los cursos (tabla pivote docente_curso)
        // Priorizando el director de curso (es_director=true). Si hay más de un docente
        // distinto entre los cursos seleccionados, se requiere docenteId explícito.

        const docenteRows = await db
          .from('docente_curso')
          .select('curso_id', 'docente_id', 'es_director', 'creado_en')
          .whereIn('curso_id', ids)
          .orderBy('es_director', 'desc')
          .orderBy('creado_en', 'asc')

        const docentePorCurso = new Map<number, number>()
        for (const row of docenteRows) {
          const curso = Number((row as any).curso_id)
          const docente = Number((row as any).docente_id)
          if (!docentePorCurso.has(curso)) {
            docentePorCurso.set(curso, docente)
          }
        }

        const faltantes = ids.filter((curso) => !docentePorCurso.has(curso))
        if (faltantes.length) {
          return response.badRequest({
            message: 'No hay docente asignado a uno o más cursos. Debes asignar un docente al curso o enviar docenteId.',
            cursosSinDocente: faltantes,
          })
        }

        const uniqueDocentes = Array.from(new Set(Array.from(docentePorCurso.values())))
        if (uniqueDocentes.length !== 1) {
          return response.badRequest({
            message: 'Los cursos seleccionados tienen docentes diferentes. Debes especificar docenteId para asignar esta tarea.',
            docentesDetectados: uniqueDocentes,
          })
        }

        docenteId = uniqueDocentes[0]
        const docente = await Docente.find(docenteId)
        if (!docente) {
          return response.badRequest({ message: 'El docente inferido no existe' })
        }
      }

    }



    const fechaInicio = fechaInicioRaw

      ? DateTime.fromISO(String(fechaInicioRaw))

      : DateTime.now().startOf('day')



    if (!fechaInicio.isValid) {

      return response.badRequest({ message: 'fechaInicio inválida (usa ISO: YYYY-MM-DD)' })

    }



    const fechaVencimiento = fechaVencimientoRaw ? DateTime.fromISO(String(fechaVencimientoRaw)) : null

    if (fechaVencimientoRaw && !fechaVencimiento?.isValid) {

      return response.badRequest({ message: 'fechaVencimiento inválida (usa ISO: YYYY-MM-DD)' })

    }



    const frecuencia = String(request.input('frecuencia') ?? 'unica')

    const incluirEnBoletin = Boolean(request.input('incluirEnBoletin') ?? request.input('incluir_en_boletin') ?? false)



    const asignacion = await Asignacion.create({

      titulo: String(request.input('titulo') ?? bancoTarea.titulo),

      descripcion: String(request.input('descripcion') ?? bancoTarea.descripcion),

      frecuencia,

      fechaInicio,

      fechaVencimiento,

      incluirEnBoletin,

      cursoId: ids.length === 1 ? ids[0] : null,

      docenteId: docenteId!,

      categoriaId,

      bancoTareaId: bancoTarea.id,

      periodoId: Number(periodoId),

      institucionId: request.input('institucionId') ?? request.input('institucion_id') ?? periodo.institucionId,

      tema: String(request.input('tema') ?? bancoTarea.tema ?? ''),

    })



    if (ids.length > 1) {

      await asignacion.related('cursos').attach(ids)

    }



    // Enviar notificaciones push a los acudientes de los estudiantes
    await this.enviarNotificacionesAsignacion(asignacion, ids)



    return response.created(asignacion)

  }

}

