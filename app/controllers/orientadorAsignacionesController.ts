import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import Funcionario from '#models/funcionario'
import Role from '#models/role'

export default class OrientadorAsignacionesController {
  private async requireOrientador(ctx: HttpContext) {
    const { jwtUser, response } = ctx as any
    if (!jwtUser) return response.unauthorized({ success: false, message: 'No autenticado' })

    const rol = await Role.find(jwtUser.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'orientador') {
      return response.forbidden({ success: false, message: 'No autorizado: requiere rol orientador' })
    }

    const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
    const institucionId = funcionario?.institucionId || null
    if (!institucionId) {
      return response.badRequest({ success: false, message: 'El orientador no tiene institución asociada' })
    }

    return { jwtUser, institucionId }
  }

  // GET /orientador/asignaciones
  async listarAsignaciones(ctx: HttpContext) {
    const guard = await this.requireOrientador(ctx)
    if ((guard as any)?.response) return guard // early return si ya respondió
    const { response, request } = ctx
    const { jwtUser, institucionId } = guard as any

    const periodoId = request.input('periodoId') ?? request.input('periodo')
    const cursoId = request.input('cursoId') ?? request.input('curso')
    const estado = String(request.input('estado') ?? '').toLowerCase() // activa | vencida | futura
    const q = String(request.input('q') ?? '').trim()
    const page = Math.max(1, Number(request.input('page') ?? 1))
    const perPage = Math.min(100, Math.max(1, Number(request.input('perPage') ?? 20)))

    const base = db
      .from('asignaciones as a')
      .leftJoin('banco_tareas as bt', 'a.banco_tarea_id', 'bt.id')
      .leftJoin('categorias as c', 'a.categoria_id', 'c.id')
      .leftJoin('docentes as d', 'a.docente_id', 'd.id')
      .where('a.institucion_id', institucionId)
      .where((qb) => {
        // "Propias" del orientador: por ser autor del banco_tarea
        qb.where('bt.creado_por', (jwtUser as any).id)
      })

    if (periodoId) base.where('a.periodo_id', periodoId)

    if (cursoId) {
      base.where((qb) => {
        qb.where('a.curso_id', cursoId).orWhereExists((sub) => {
          sub
            .from('asignacion_cursos as ac')
            .whereRaw('ac.asignacion_id = a.id')
            .where('ac.curso_id', cursoId)
        })
      })
    }

    if (q) {
      base.where((qb) => {
        qb.whereILike('a.titulo', `%${q}%`).orWhereILike('a.descripcion', `%${q}%`)
      })
    }

    // Estado por fechas
    const hoy = DateTime.now().toISODate()!
    if (estado === 'activa') {
      base.where('a.fecha_inicio', '<=', hoy).andWhere((qb) => {
        qb.whereNull('a.fecha_vencimiento').orWhere('a.fecha_vencimiento', '>=', hoy)
      })
    } else if (estado === 'vencida') {
      base.whereNotNull('a.fecha_vencimiento').andWhere('a.fecha_vencimiento', '<', hoy)
    } else if (estado === 'futura') {
      base.where('a.fecha_inicio', '>', hoy)
    }

    // Conteo total
    const countQuery = base.clone().countDistinct('a.id as total')
    const countRes = await countQuery
    const total = Number(countRes[0]?.total || 0)

    // Datos con paginación
    const rows = await base
      .clone()
      .select(
        'a.id',
        'a.titulo',
        'a.descripcion',
        'a.periodo_id as periodoId',
        'a.fecha_inicio as fechaInicio',
        'a.fecha_vencimiento as fechaVencimiento',
        'a.curso_id as cursoId',
        'c.nombre as categoria',
        'd.nombres as docenteNombre',
        'd.apellidos as docenteApellido'
      )
      .orderBy('a.id', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage)

    // Obtener cursos asociados (pivot) para estas asignaciones
    const asigIds = rows.map((r: any) => r.id)
    // Obtener asignaciones marcadas como individuales (existen filas en asignacion_estudiantes)
    let esIndividualSet = new Set<number>()
    if (asigIds.length) {
      const indivRows = await db
        .from('asignacion_estudiantes as ae')
        .whereIn('ae.asignacion_id', asigIds)
        .select('ae.asignacion_id as asignacionId')
      esIndividualSet = new Set(indivRows.map((r: any) => Number(r.asignacionId)))
    }
    let cursosMap = new Map<number, { id: number; nombre: string }[]>()
    if (asigIds.length) {
      const cursosPivot = await db
        .from('asignacion_cursos as ac')
        .join('cursos as cu', 'ac.curso_id', 'cu.id')
        .whereIn('ac.asignacion_id', asigIds)
        .select('ac.asignacion_id as asignacionId', 'cu.id', 'cu.nombre')
      cursosMap = cursosPivot.reduce((map, row) => {
        const list = map.get(row.asignacionId) ?? []
        list.push({ id: row.id, nombre: row.nombre })
        map.set(row.asignacionId, list)
        return map
      }, new Map<number, { id: number; nombre: string }[]>())
    }

    const data = rows.map((r: any) => {
      const estadoCalc = (() => {
        const fi = r.fechaInicio ? DateTime.fromJSDate(r.fechaInicio) : null
        const fv = r.fechaVencimiento ? DateTime.fromJSDate(r.fechaVencimiento) : null
        if (fi && fi > DateTime.now()) return 'futura'
        if (fv && fv < DateTime.now()) return 'vencida'
        return 'activa'
      })()

      const cursos = [
        ...(r.cursoId ? [{ id: r.cursoId, nombre: undefined }] : []),
        ...(cursosMap.get(r.id) ?? []),
      ]

      return {
        id: r.id,
        titulo: r.titulo,
        descripcion: r.descripcion,
        periodoId: r.periodoId,
        fechaInicio: r.fechaInicio,
        fechaVencimiento: r.fechaVencimiento,
        categoria: r.categoria,
        docente: [r.docenteNombre, r.docenteApellido].filter(Boolean).join(' ').trim() || null,
        cursos,
        esIndividual: esIndividualSet.has(r.id),
        estado: estadoCalc,
      }
    })

    return response.ok({
      success: true,
      data,
      meta: { page, perPage, total },
    })
  }

  // GET /orientador/asignaciones/:id/resumen
  async resumenAsignacion(ctx: HttpContext) {
    const guard = await this.requireOrientador(ctx)
    if ((guard as any)?.response) return guard
    const { response, params } = ctx
    const { jwtUser, institucionId } = guard as any

    const asignacionId = Number(params.id)
    if (Number.isNaN(asignacionId)) {
      return response.badRequest({ success: false, message: 'asignacionId inválido' })
    }

    // Verificar que la asignación pertenece a la institución y fue creada desde un banco del orientador
    const asig = await db
      .from('asignaciones as a')
      .leftJoin('banco_tareas as bt', 'a.banco_tarea_id', 'bt.id')
      .where('a.id', asignacionId)
      .where('a.institucion_id', institucionId)
      .where('bt.creado_por', (jwtUser as any).id)
      .select('a.*')
      .first()

    if (!asig) {
      return response.notFound({ success: false, message: 'Asignación no encontrada o no autorizada' })
    }

    // Cursos de la asignación (directo + pivot)
    const cursosDirecto = asig.curso_id ? [{ id: asig.curso_id }] : []
    const cursosPivot = await db
      .from('asignacion_cursos as ac')
      .join('cursos as c', 'ac.curso_id', 'c.id')
      .where('ac.asignacion_id', asignacionId)
      .select('c.id', 'c.nombre')

    const cursoIds = [
      ...cursosDirecto.map((c: any) => Number(c.id)),
      ...cursosPivot.map((c: any) => Number(c.id)),
    ]

    // Estudiantes esperados (todos los de los cursos)
    let estudiantes: { id: number; nombre: string }[] = []
    if (cursoIds.length) {
      const rows = await db
        .from('estudiantes as e')
        .whereIn('e.curso_id', cursoIds)
        .whereNull('e.eliminado_en')
        .select('e.id', 'e.nombres', 'e.apellidos')
      estudiantes = rows.map((r) => ({ id: r.id, nombre: `${r.nombres} ${r.apellidos}` }))
    }

    // Entregas por estudiante
    const entregas = await db
      .from('entregas as en')
      .where('en.asignacion_id', asignacionId)
      .select('en.estudiante_id as estudianteId')
      .groupBy('en.estudiante_id')

    const entregadosSet = new Set<number>(entregas.map((e) => Number(e.estudianteId)))
    const entregados = estudiantes.filter((e) => entregadosSet.has(e.id))
    const noEntregados = estudiantes.filter((e) => !entregadosSet.has(e.id))

    // Promedio de calificaciones de esta asignación
    const promRes = await db
      .from('calificaciones')
      .where('asignacion_id', asignacionId)
      .avg('nota as promedio')
    const promedio = promRes[0]?.promedio ? Number(Number(promRes[0].promedio).toFixed(1)) : 0

    // Cumplimiento (%)
    const totalEsperado = estudiantes.length
    const cumplimiento = totalEsperado > 0 ? Math.round((entregados.length / totalEsperado) * 100) : 0

    return response.ok({
      success: true,
      data: {
        asignacion: {
          id: asig.id,
          titulo: asig.titulo,
          descripcion: asig.descripcion,
          periodoId: asig.periodo_id,
          fechaInicio: asig.fecha_inicio,
          fechaVencimiento: asig.fecha_vencimiento,
        },
        cursos: [
          ...cursosDirecto,
          ...cursosPivot.map((c: any) => ({ id: c.id, nombre: c.nombre })),
        ],
        resumen: {
          totalEstudiantes: totalEsperado,
          entregados: entregados.length,
          noEntregados: noEntregados.length,
          cumplimiento,
          promedio,
        },
        entregados,
        noEntregados,
      },
    })
  }

  // GET /orientador/entregas
  async listarEntregas(ctx: HttpContext) {
    const guard = await this.requireOrientador(ctx)
    if ((guard as any)?.response) return guard
    const { response, request } = ctx
    const { institucionId } = guard as any

    const periodoId = request.input('periodoId') ?? request.input('periodo')
    const cursoId = request.input('cursoId') ?? request.input('curso')
    const asignacionId = request.input('asignacionId') ?? request.input('asignacion')
    const estado = String(request.input('estado') ?? '').toLowerCase() // enviada | entregada | entregada_tardia | calificada
    const q = String(request.input('q') ?? '').trim()
    const page = Math.max(1, Number(request.input('page') ?? 1))
    const perPage = Math.min(100, Math.max(1, Number(request.input('perPage') ?? 20)))

    const base = db
      .from('entregas as en')
      .join('asignaciones as a', 'en.asignacion_id', 'a.id')
      .join('estudiantes as e', 'en.estudiante_id', 'e.id')
      .leftJoin('cursos as c', 'e.curso_id', 'c.id')
      .leftJoin('calificaciones as cal', 'cal.entrega_id', 'en.id')
      .leftJoin('asignacion_estudiantes as ae', function () {
        this.on('ae.asignacion_id', '=', 'en.asignacion_id').andOn('ae.estudiante_id', '=', 'en.estudiante_id')
      })
      .where('a.institucion_id', institucionId)

    if (periodoId) base.where('a.periodo_id', periodoId)
    if (cursoId) base.where('e.curso_id', cursoId)
    if (asignacionId) base.where('en.asignacion_id', asignacionId)
    if (estado) base.where('en.estado', estado)
    if (q) {
      base.where((qb) => {
        qb.whereILike('a.titulo', `%${q}%`).orWhereILike('e.nombres', `%${q}%`).orWhereILike('e.apellidos', `%${q}%`)
      })
    }

    const countRes = await base.clone().countDistinct('en.id as total')
    const total = Number(countRes[0]?.total || 0)

    const rows = await base
      .clone()
      .select(
        'en.id',
        'en.asignacion_id as asignacionId',
        'a.titulo as asignacionTitulo',
        'en.estudiante_id as estudianteId',
        'e.nombres as estudianteNombre',
        'e.apellidos as estudianteApellido',
        'e.curso_id as cursoId',
        'c.nombre as cursoNombre',
        'en.fecha_entrega as fechaEntrega',
        'en.estado as estado',
        'en.nombre_envio as nombreEnvio',
        'en.evidencia_texto as evidenciaTexto',
        'en.archivos_url as archivosRaw',
        'cal.nota as calNota',
        'cal.escala as calEscala',
        'ae.id as esIndividualFlag'
      )
      .orderBy('en.id', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage)

    const data = rows.map((r: any) => {
      let archivos: any[] = []
      const raw: any = r.archivosRaw
      if (raw) {
        if (Array.isArray(raw)) archivos = raw
        else if (typeof raw === 'object') archivos = raw
        else if (typeof raw === 'string') {
          const s = raw.trim()
          if (s && s !== '[object Object]' && (s.startsWith('[') || s.startsWith('{'))) {
            try { archivos = JSON.parse(s) } catch { archivos = [] }
          }
        }
      }

      return {
        id: r.id,
        asignacion: { id: r.asignacionId, titulo: r.asignacionTitulo },
        estudiante: { id: r.estudianteId, nombre: [r.estudianteNombre, r.estudianteApellido].filter(Boolean).join(' ').trim() },
        curso: r.cursoId ? { id: r.cursoId, nombre: r.cursoNombre } : null,
        fechaEntrega: r.fechaEntrega,
        estado: r.estado,
        nombreEnvio: r.nombreEnvio,
        descripcion: r.evidenciaTexto,
        archivos,
        esIndividual: Boolean(r.esIndividualFlag),
        calificacion: r.calNota !== null && r.calNota !== undefined ? { nota: r.calNota, escala: r.calEscala } : null,
      }
    })

    return response.ok({ success: true, data, meta: { page, perPage, total } })
  }
}
