import type { HttpContext } from '@adonisjs/core/http'

import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'



import Asignacion from '#models/asignacion'

import BancoTarea from '#models/banco_tarea'

import Categoria from '#models/categoria'

import Curso from '#models/curso'

import Docente from '#models/docente'
import Funcionario from '#models/funcionario'

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
    const estudianteIdsInput = request.input('estudianteIds') ?? request.input('estudiante_ids')
    const periodoId = request.input('periodoId') ?? request.input('periodo_id')
    const fechaInicioRaw = request.input('fechaInicio') ?? request.input('fecha_inicio')
    const fechaVencimientoRaw = request.input('fechaVencimiento') ?? request.input('fecha_vencimiento')

    if (!bancoTareaId) {
      return response.badRequest({ message: 'bancoTareaId es requerido' })
    }

    if (!periodoId) {
      return response.badRequest({ message: 'periodoId es requerido' })
    }

    const idsCursos: number[] = Array.isArray(cursoIds)
      ? cursoIds.map((id: any) => Number(id))
      : cursoId !== undefined && cursoId !== null
        ? [Number(cursoId)]
        : []
    const idsEstudiantes: number[] = Array.isArray(estudianteIdsInput)
      ? (estudianteIdsInput as any[]).map((x) => Number(x))
      : estudianteIdsInput !== undefined && estudianteIdsInput !== null && estudianteIdsInput !== ''
      ? [Number(estudianteIdsInput)]
      : []

    if ((!idsCursos.length && !idsEstudiantes.length) || idsCursos.some((id) => Number.isNaN(id)) || idsEstudiantes.some((id) => Number.isNaN(id))) {
      return response.badRequest({ message: 'Debes enviar cursoId/cursoIds o estudianteIds válidos' })
    }

    const bancoTarea = await BancoTarea.find(bancoTareaId)
    if (!bancoTarea) {
      return response.badRequest({ message: 'La bancoTareaId no existe' })
    }

    let cursos: Curso[] = []
    if (idsCursos.length) {
      cursos = await Curso.query().whereIn('id', idsCursos)
      if (cursos.length !== idsCursos.length) {
        return response.badRequest({ message: 'Uno o más cursoIds no existen' })
      }
    }

    if (idsEstudiantes.length) {
      const ests = await Estudiante.query().whereIn('id', idsEstudiantes)
      if (ests.length !== idsEstudiantes.length) {
        return response.badRequest({ message: 'Uno o más estudianteIds no existen' })
      }
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

    const docenteRows = idsCursos.length ? await db
      .from('docente_curso')
      .select('curso_id', 'docente_id', 'es_director', 'creado_en')
      .whereIn('curso_id', idsCursos)
      .orderBy('es_director', 'desc')
      .orderBy('creado_en', 'asc')
      : []

    const docentePorCurso = new Map<number, number>()
    for (const row of docenteRows) {
      const curso = Number((row as any).curso_id)
      const docente = Number((row as any).docente_id)
      if (!docentePorCurso.has(curso)) {
        docentePorCurso.set(curso, docente)
      }
    }

    const faltantes = idsCursos.filter((curso) => !docentePorCurso.has(curso))

    const cursosPorDocente = new Map<number, number[]>()
    for (const curso of idsCursos) {
      const docenteId = docentePorCurso.get(curso)
      if (docenteId !== undefined) {
        const list = cursosPorDocente.get(docenteId) ?? []
        list.push(curso)
        cursosPorDocente.set(docenteId, list)
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

    const asignacionesCreadas: Asignacion[] = []

    // Caso especial: asignación individual a estudiantes (sin cursos)
    if (idsEstudiantes.length) {
      // Reutilizar/crear un Docente para el orientador actual como propietario de la asignación
      let docenteOwner = await Docente.query().where('usuario_id', usuario.id).first()
      if (!docenteOwner) {
        const func = await Funcionario.query().where('usuario_id', usuario.id).first()
        const institucionIdInferida = func?.institucionId ?? (await Periodo.find(periodoId))!.institucionId
        docenteOwner = await Docente.create({
          nombres: func?.nombre ?? 'Orientador',
          apellidos: func?.apellido ?? 'Del Sistema',
          tipoDocumento: 'N/A',
          numeroDocumento: `orientador-${usuario.id}`,
          telefono: '0000000000',
          correo: `orientador_${usuario.id}@placeholder.local`,
          institucionId: institucionIdInferida!,
          usuarioId: usuario.id,
        })
      }

      const asignacion = await Asignacion.create({
        titulo: String(request.input('titulo') ?? bancoTarea.titulo),
        descripcion: String(request.input('descripcion') ?? bancoTarea.descripcion),
        frecuencia: String(request.input('frecuencia') ?? 'unica'),
        fechaInicio,
        fechaVencimiento,
        incluirEnBoletin,
        cursoId: null,
        docenteId: docenteOwner.id,
        categoriaId,
        bancoTareaId: bancoTarea.id,
        periodoId: Number(periodoId),
        institucionId: request.input('institucionId') ?? request.input('institucion_id') ?? periodo.institucionId,
        tema: String(request.input('tema') ?? bancoTarea.tema ?? ''),
      })

      // Pivot asignacion_estudiantes
      const rows = idsEstudiantes.map((eid) => ({ asignacion_id: asignacion.id, estudiante_id: eid }))
      await db.table('asignacion_estudiantes').multiInsert(rows)

      // Notificar a acudientes de esos estudiantes
      const estudiantes = await Estudiante.query()
        .whereIn('id', idsEstudiantes)
        .preload('acudientes', (q) => q.preload('usuario'))
      const acudienteUserIds = new Set<number>()
      estudiantes.forEach((e) => e.acudientes.forEach((a) => { if (a.usuarioId) acudienteUserIds.add(a.usuarioId) }))
      for (const userId of acudienteUserIds) {
        await MovilController.enviarNotificacionPush(
          userId,
          '📚 Nueva Tarea Individual',
          `Se asignó una tarea a tu acudido: ${asignacion.titulo}`,
          'tarea_individual',
          { asignacion_id: asignacion.id, tipo: 'nueva_tarea_individual', fecha_vencimiento: asignacion.fechaVencimiento?.toISO() }
        )
      }

      asignacionesCreadas.push(asignacion)
    }

    // Crear asignaciones para cursos con docente asociado
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

    // Crear asignación para cursos sin docente usando un Docente placeholder del orientador (evitar NULL por restricción)
    if (faltantes.length > 0) {
      // Reutilizar/crear un Docente para el orientador actual
      let docenteFallback = await Docente.query().where('usuario_id', usuario.id).first()
      if (!docenteFallback) {
        const func = await Funcionario.query().where('usuario_id', usuario.id).first()
        const institucionIdInferida = func?.institucionId ?? (await Periodo.find(periodoId))!.institucionId
        docenteFallback = await Docente.create({
          nombres: func?.nombre ?? 'Orientador',
          apellidos: func?.apellido ?? 'Del Sistema',
          tipoDocumento: 'N/A',
          numeroDocumento: `orientador-${usuario.id}`,
          telefono: '0000000000',
          correo: `orientador_${usuario.id}@placeholder.local`,
          institucionId: institucionIdInferida!,
          usuarioId: usuario.id,
        })
      }

      const asignacionSinDocente = await Asignacion.create({
        titulo: String(request.input('titulo') ?? bancoTarea.titulo),
        descripcion: String(request.input('descripcion') ?? bancoTarea.descripcion),
        frecuencia,
        fechaInicio,
        fechaVencimiento,
        incluirEnBoletin,
        cursoId: faltantes.length === 1 ? faltantes[0] : null,
        docenteId: docenteFallback.id,
        categoriaId,
        bancoTareaId: bancoTarea.id,
        periodoId: Number(periodoId),
        institucionId: request.input('institucionId') ?? request.input('institucion_id') ?? periodo.institucionId,
        tema: String(request.input('tema') ?? bancoTarea.tema ?? ''),
      })

      if (faltantes.length > 1) {
        await asignacionSinDocente.related('cursos').attach(faltantes)
      }

      await this.enviarNotificacionesAsignacion(asignacionSinDocente, faltantes)
      asignacionesCreadas.push(asignacionSinDocente)
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

    const asignacion = await Asignacion.find(params.id)
    if (!asignacion) {
      return response.notFound({ message: 'Asignación no encontrada' })
    }

    // Autorización
    let autorizado = false
    if (nombreRol === 'docente') {
      const docente = await Docente.query().where('usuario_id', usuario.id).first()
      autorizado = !!docente && asignacion.docenteId === docente.id
    } else if (nombreRol === 'orientador') {
      const func = await Funcionario.query().where('usuario_id', usuario.id).first()
      autorizado = !!func && (!!asignacion.institucionId ? asignacion.institucionId === func.institucionId : true)
    }
    if (!autorizado) {
      return response.forbidden({ message: 'No tienes permiso para editar esta asignación' })
    }

    // Campos opcionales
    const titulo = request.input('titulo')
    const descripcion = request.input('descripcion')
    const frecuencia = request.input('frecuencia')
    const incluirEnBoletin = request.input('incluirEnBoletin') ?? request.input('incluir_en_boletin')
    const tema = request.input('tema')
    const fechaInicioRaw = request.input('fechaInicio') ?? request.input('fecha_inicio')
    const fechaVencimientoRaw = request.input('fechaVencimiento') ?? request.input('fecha_vencimiento')
    const cursoId = request.input('cursoId') ?? request.input('curso_id')
    const cursoIds = request.input('cursoIds') ?? request.input('curso_ids')

    if (titulo !== undefined) asignacion.titulo = String(titulo)
    if (descripcion !== undefined) asignacion.descripcion = String(descripcion)
    if (frecuencia !== undefined) asignacion.frecuencia = String(frecuencia)
    if (incluirEnBoletin !== undefined) asignacion.incluirEnBoletin = Boolean(incluirEnBoletin)
    if (tema !== undefined) asignacion.tema = String(tema)

    if (fechaInicioRaw !== undefined) {
      const fi = DateTime.fromISO(String(fechaInicioRaw))
      if (!fi.isValid) return response.badRequest({ message: 'fechaInicio inválida (usa ISO: YYYY-MM-DD)' })
      asignacion.fechaInicio = fi
    }
    if (fechaVencimientoRaw !== undefined) {
      const fv = fechaVencimientoRaw ? DateTime.fromISO(String(fechaVencimientoRaw)) : null
      if (fechaVencimientoRaw && !fv?.isValid) return response.badRequest({ message: 'fechaVencimiento inválida (usa ISO: YYYY-MM-DD)' })
      asignacion.fechaVencimiento = fv
    }

    // Re-vincular cursos si se envían
    const ids: number[] = Array.isArray(cursoIds)
      ? (cursoIds as any[]).map((x) => Number(x))
      : cursoId !== undefined && cursoId !== null
      ? [Number(cursoId)]
      : []

    if (ids.length) {
      const cursos = await Curso.query().whereIn('id', ids)
      if (cursos.length !== ids.length) {
        return response.badRequest({ message: 'Uno o más cursoIds no existen' })
      }

      asignacion.cursoId = ids.length === 1 ? ids[0] : null
      await asignacion.save()
      await asignacion.related('cursos').detach()
      if (ids.length > 1) {
        await asignacion.related('cursos').attach(ids)
      }
    } else {
      await asignacion.save()
    }

    return response.ok(asignacion)
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

    const asignacion = await Asignacion.find(params.id)
    if (!asignacion) {
      return response.notFound({ message: 'Asignación no encontrada' })
    }

    // Autorización
    let autorizado = false
    if (nombreRol === 'docente') {
      const docente = await Docente.query().where('usuario_id', usuario.id).first()
      autorizado = !!docente && asignacion.docenteId === docente.id
    } else if (nombreRol === 'orientador') {
      const func = await Funcionario.query().where('usuario_id', usuario.id).first()
      autorizado = !!func && (!!asignacion.institucionId ? asignacion.institucionId === func.institucionId : true)
    }
    if (!autorizado) {
      return response.forbidden({ message: 'No tienes permiso para eliminar esta asignación' })
    }

    const entregasCount = await db.from('entregas').where('asignacion_id', asignacion.id).count('* as total')
    const califCount = await db.from('calificaciones').where('asignacion_id', asignacion.id).count('* as total')
    const totalEntregas = Number(entregasCount[0]?.total || 0)
    const totalCalif = Number(califCount[0]?.total || 0)
    if (totalEntregas > 0 || totalCalif > 0) {
      return response.conflict({
        message: 'No se puede eliminar: existen entregas o calificaciones asociadas',
        entregas: totalEntregas,
        calificaciones: totalCalif,
      })
    }

    await asignacion.related('cursos').detach()
    await asignacion.delete()
    return response.ok({ success: true })
  }


}
