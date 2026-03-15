import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import Asignacion from '#models/asignacion'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class DocenteScopeController {
  private async getDocenteOrFail(ctx: HttpContext) {
    const { response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined

    if (!usuario) {
      response.unauthorized({ message: 'No autenticado' })
      return null
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente') {
      response.forbidden({ message: 'Acceso denegado' })
      return null
    }

    const docente = await Docente.query().where('usuario_id', usuario.id).first()
    if (!docente) {
      response.notFound({ message: 'Docente no encontrado para este usuario' })
      return null
    }

    return docente
  }

  private async getDocenteCursoIds(docenteId: number): Promise<number[]> {
    const rows = await db.from('docente_curso').where('docente_id', docenteId).select('curso_id')
    const cursoIds = rows.map((r) => Number(r.curso_id)).filter((id) => !Number.isNaN(id))
    return [...new Set(cursoIds)]
  }

  async misCursos(ctx: HttpContext) {
    const { request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const cursoIds = await this.getDocenteCursoIds(docente.id)
    if (!cursoIds.length) {
      return response.ok({ cursos: [] })
    }

    const includeGrado = String(request.input('includeGrado') ?? request.qs().includeGrado ?? '')
      .trim()
      .toLowerCase()
    const preloadGrado = includeGrado === '1' || includeGrado === 'true'

    const query = Curso.query().whereIn('id', cursoIds).orderBy('grado_id').orderBy('nombre')
    if (preloadGrado) query.preload('grado')

    const cursos = await query
    return response.ok({ cursos })
  }

  async estudiantes(ctx: HttpContext) {
    const { request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const cursoIds = await this.getDocenteCursoIds(docente.id)
    if (!cursoIds.length) {
      return response.ok({ estudiantes: [] })
    }

    const cursoIdRaw = request.input('cursoId') ?? request.qs().cursoId ?? request.input('curso_id')
    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined

    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }

    if (cursoId !== undefined && !cursoIds.includes(cursoId)) {
      return response.forbidden({ message: 'No tienes acceso a ese curso' })
    }

    const includeAcudientes = String(
      request.input('includeAcudientes') ?? request.qs().includeAcudientes ?? ''
    )
      .trim()
      .toLowerCase()
    const preloadAcudientes = includeAcudientes === '1' || includeAcudientes === 'true'

    const query = Estudiante.query()
      .whereIn('curso_id', cursoId !== undefined ? [cursoId] : cursoIds)
      .orderBy('apellidos')
      .orderBy('nombres')

    if (preloadAcudientes) query.preload('acudientes')

    const estudiantes = await query
    return response.ok({ estudiantes })
  }

  async acudientes(ctx: HttpContext) {
    const { request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const cursoIds = await this.getDocenteCursoIds(docente.id)
    if (!cursoIds.length) {
      return response.ok({ acudientes: [] })
    }

    const cursoIdRaw = request.input('cursoId') ?? request.qs().cursoId ?? request.input('curso_id')
    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined

    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }

    if (cursoId !== undefined && !cursoIds.includes(cursoId)) {
      return response.forbidden({ message: 'No tienes acceso a ese curso' })
    }

    const targetCursoIds = cursoId !== undefined ? [cursoId] : cursoIds

    const acudientes = await db
      .from('acudientes')
      .join('estudiante_acudiente as ea', 'acudientes.id', 'ea.acudiente_id')
      .join('estudiantes', 'ea.estudiante_id', 'estudiantes.id')
      .whereIn('estudiantes.curso_id', targetCursoIds)
      .distinct(
        'acudientes.id',
        'acudientes.nombres',
        'acudientes.apellidos',
        'acudientes.tipo_documento',
        'acudientes.numero_documento',
        'acudientes.telefono',
        'acudientes.telefono_alternativo',
        'acudientes.correo',
        'acudientes.direccion',
        'acudientes.parentesco',
        'acudientes.ocupacion',
        'acudientes.tipo_trabajo',
        'acudientes.nivel_educativo',
        'acudientes.aporta_economia',
        'acudientes.horario_trabajo',
        'acudientes.usuario_id',
        'acudientes.creado_en',
        'acudientes.actualizado_en',
        'acudientes.eliminado_en'
      )
      .orderBy('acudientes.apellidos')
      .orderBy('acudientes.nombres')

    return response.ok({ acudientes })
  }

  async entregas(ctx: HttpContext) {
    const { request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const cursoIdRaw = request.input('cursoId') ?? request.qs().cursoId ?? request.input('curso_id')
    const asignacionIdRaw =
      request.input('asignacionId') ?? request.qs().asignacionId ?? request.input('asignacion_id')
    const sortRaw = (request.input('sort') ?? request.qs().sort ?? '').toString().trim().toLowerCase()
    const pageRaw = request.input('page') ?? request.qs().page
    const perPageRaw = request.input('perPage') ?? request.qs().perPage

    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined
    const asignacionId = asignacionIdRaw !== undefined ? Number(asignacionIdRaw) : undefined
    const page = pageRaw !== undefined ? Math.max(1, Number(pageRaw)) : 1
    const perPage = perPageRaw !== undefined ? Math.max(1, Math.min(100, Number(perPageRaw))) : 20

    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }
    if (asignacionId !== undefined && Number.isNaN(asignacionId)) {
      return response.badRequest({ message: 'asignacionId inválido' })
    }
    if (pageRaw !== undefined && Number.isNaN(page)) {
      return response.badRequest({ message: 'page inválido' })
    }
    if (perPageRaw !== undefined && Number.isNaN(perPage)) {
      return response.badRequest({ message: 'perPage inválido' })
    }

    const soloPendientes = String(request.input('soloPendientes') ?? request.qs().soloPendientes ?? 'true')
      .trim()
      .toLowerCase()
    const onlyPending = soloPendientes === '1' || soloPendientes === 'true'

    const asignacionesQuery = Asignacion.query().where('docente_id', docente.id)

    if (asignacionId !== undefined) {
      asignacionesQuery.where('id', asignacionId)
    }

    if (cursoId !== undefined) {
      asignacionesQuery.where((q) => {
        q.where('curso_id', cursoId).orWhereHas('cursos', (q2) => {
          q2.where('cursos.id', cursoId)
        })
      })
    }

    const asignaciones = await asignacionesQuery.select(['id'])
    const asignacionIds = asignaciones.map((a) => a.id)

    if (!asignacionIds.length) {
      return response.ok({ entregas: [], meta: { total: 0, page, perPage, lastPage: 0 } })
    }

    const entregasQuery = Entrega.query()
      .whereIn('asignacion_id', asignacionIds)
      .preload('asignacion')
      .preload('estudiante')
      .preload('acudiente')
      .preload('calificacion')

    // Sort admitido: fechaEntrega asc|desc, id asc|desc (default: fechaEntrega desc)
    const sortMap: Record<string, { col: string; dir: 'asc' | 'desc' }> = {
      'fechaentrega:asc': { col: 'fecha_entrega', dir: 'asc' },
      'fechaentrega:desc': { col: 'fecha_entrega', dir: 'desc' },
      'id:asc': { col: 'id', dir: 'asc' },
      'id:desc': { col: 'id', dir: 'desc' },
    }
    const sortConf = sortMap[sortRaw] ?? sortMap['fechaentrega:desc']
    entregasQuery.orderBy(sortConf.col as any, sortConf.dir)

    if (onlyPending) {
      entregasQuery.where('estado', 'enviada').whereDoesntHave('calificacion', () => {})
    }

    const paginated = await entregasQuery.paginate(page, perPage)
    const rows = paginated.all()

    // Normalizar archivos y campos calculados por entrega
    const parseArchivos = (raw: any): Array<{ url: string; fileName: string; mimeType: string }> => {
      const ensureArray = (): any[] => {
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'object') return [raw]
        if (typeof raw === 'string') {
          const s = raw.trim()
          if (!s || s === '[object Object]') return []
          try {
            const parsed = JSON.parse(s)
            if (Array.isArray(parsed)) return parsed
            if (parsed && typeof parsed === 'object') return [parsed]
            return []
          } catch {
            return []
          }
        }
        return []
      }
      const arr = ensureArray()
      return arr
        .map((a: any) => ({
          url: String(a.url ?? a.path ?? ''),
          fileName: String(a.fileName ?? a.name ?? a.originalName ?? '').slice(0, 120),
          mimeType: String(a.mimeType ?? a.mimetype ?? a.type ?? ''),
        }))
        .filter((a) => a.url)
    }

    const clamp = (n: number) => Math.max(1.0, Math.min(5.0, Number(n.toFixed(1))))

    const data = rows.map((e) => {
      const fechaVenc = (e as any).$preloaded?.asignacion?.fechaVencimiento
        ? DateTime.fromJSDate(new Date((e as any).$preloaded.asignacion.fechaVencimiento.toString()))
        : null
      const fechaEnt = e.fechaEntrega ? DateTime.fromJSDate(new Date(e.fechaEntrega.toString())) : null
      let diasTarde = 0
      if (fechaVenc && fechaEnt) {
        const diffDays = Math.ceil(fechaEnt.diff(fechaVenc, 'days').days)
        diasTarde = Math.max(0, diffDays)
      }
      const entregadoATiempo = diasTarde === 0
      const calificacionSugerida = clamp(5.0 - 0.1 * diasTarde)

      const archivos = parseArchivos((e as any).archivosUrl)

      const estudiante = (e as any).$preloaded?.estudiante
      const estudianteNombre = estudiante
        ? `${estudiante.nombres ?? ''} ${estudiante.apellidos ?? ''}`.trim()
        : undefined

      const asignacion = (e as any).$preloaded?.asignacion

      return {
        ...e.serialize(),
        archivos,
        estudianteNombre,
        asignacion: asignacion
          ? {
              id: asignacion.id,
              titulo: asignacion.titulo,
              fechaVencimiento: asignacion.fechaVencimiento,
            }
          : null,
        entregadoATiempo,
        diasTarde,
        calificacionSugerida,
      }
    })

    return response.ok({
      entregas: data,
      meta: {
        total: paginated.total,
        page: paginated.currentPage,
        perPage: paginated.perPage,
        lastPage: paginated.lastPage,
      },
    })
  }

  async docentes(ctx: HttpContext) {
    const { response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const docentes = await Docente.query()
      .where('institucion_id', docente.institucionId!)
      .orderBy('apellidos')
      .orderBy('nombres')

    return response.ok({ docentes })
  }

  async asignaciones(ctx: HttpContext) {
    const { request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const periodoIdRaw = request.input('periodoId') ?? request.qs().periodoId ?? request.input('periodo')
    const cursoIdRaw = request.input('cursoId') ?? request.qs().cursoId ?? request.input('curso_id')
    const estadoRaw = (request.input('estado') ?? request.qs().estado ?? '').toString().toLowerCase().trim()
    const detalleRaw = (request.input('detallePorCurso') ?? request.qs().detallePorCurso ?? '').toString().toLowerCase().trim()
    const pageRaw = request.input('page') ?? request.qs().page
    const perPageRaw = request.input('perPage') ?? request.qs().perPage

    const periodoId = periodoIdRaw !== undefined ? Number(periodoIdRaw) : undefined
    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined
    const page = pageRaw !== undefined ? Math.max(1, Number(pageRaw)) : 1
    const perPage = perPageRaw !== undefined ? Math.max(1, Math.min(100, Number(perPageRaw))) : 10
    const detallePorCurso = detalleRaw === '1' || detalleRaw === 'true'

    if (periodoId !== undefined && Number.isNaN(periodoId)) {
      return response.badRequest({ message: 'periodoId inválido' })
    }
    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }
    if (pageRaw !== undefined && Number.isNaN(page)) {
      return response.badRequest({ message: 'page inválido' })
    }
    if (perPageRaw !== undefined && Number.isNaN(perPage)) {
      return response.badRequest({ message: 'perPage inválido' })
    }
    if (estadoRaw && !['pendiente', 'entregada', 'calificada', 'vencida'].includes(estadoRaw)) {
      return response.badRequest({ message: 'estado inválido' })
    }

    // Limitar a cursos del docente
    const cursoIdsDocente = await this.getDocenteCursoIds(docente.id)
    if (cursoId !== undefined && !cursoIdsDocente.includes(cursoId)) {
      return response.forbidden({ message: 'No tienes acceso a ese curso' })
    }

    const asignacionesQuery = Asignacion.query()
      .where('docente_id', docente.id)
      .orderBy('fecha_inicio', 'desc')
      .preload('categoria')
      .preload('bancoTarea')
      .preload('curso')

    if (periodoId !== undefined) asignacionesQuery.where('periodo_id', periodoId)
    if (cursoId !== undefined) {
      asignacionesQuery.where((q) => {
        q.where('curso_id', cursoId).orWhereHas('cursos', (q2) => {
          q2.where('cursos.id', cursoId)
        })
      })
    }

    const paginated = await asignacionesQuery.paginate(page, perPage)
    const asignaciones = paginated.all()

    // Determinar cuáles asignaciones son individuales (tienen filas en asignacion_estudiantes)
    let esIndividualSet = new Set<number>()
    if (asignaciones.length) {
      const ids = asignaciones.map((a) => a.id)
      const indivRows = await db
        .from('asignacion_estudiantes as ae')
        .whereIn('ae.asignacion_id', ids)
        .select('ae.asignacion_id as asignacionId')
      esIndividualSet = new Set(indivRows.map((r: any) => Number(r.asignacionId)))
    }

    // Armar métricas por asignación
    const resultados = [] as any[]
    for (const asig of asignaciones) {
      // Determinar cursos objetivo de la asignación
      let targetCursoIds: number[] = []
      if (asig.cursoId) {
        targetCursoIds = [asig.cursoId]
      } else {
        const rows = await db
          .from('asignacion_cursos')
          .where('asignacion_id', asig.id)
          .select('curso_id')
        targetCursoIds = rows.map((r: any) => Number(r.curso_id))
      }

      // Filtrar por el curso solicitado y por cursos del docente
      targetCursoIds = targetCursoIds.filter((id) =>
        (cursoId !== undefined ? id === cursoId : true) && cursoIdsDocente.includes(id)
      )

      // Si por alguna razón no hay cursos objetivo visibles para este docente, continuar
      if (targetCursoIds.length === 0) {
        resultados.push({
          id: asig.id,
          titulo: asig.titulo,
          descripcion: asig.descripcion,
          fechaInicio: asig.fechaInicio?.toISODate?.() ?? null,
          fechaVencimiento: asig.fechaVencimiento?.toISODate?.() ?? null,
          categoria: (asig as any).$preloaded?.categoria?.nombre ?? null,
          bancoTareaId: asig.bancoTareaId,
          cursos: [],
          esIndividual: esIndividualSet.has(asig.id),
          totalEstudiantes: 0,
          entregas: 0,
          porcentajeEntrega: 0,
        })
        continue
      }

      // Total estudiantes en los cursos objetivo
      const estRow = await db
        .from('estudiantes')
        .whereIn('curso_id', targetCursoIds)
        .whereNull('eliminado_en')
        .count('* as total')
      const totalEstudiantes = Number(estRow[0]?.total || 0)

      // Entregas realizadas por estudiantes de esos cursos para esta asignación
      const entregasRow = await db
        .from('entregas as e')
        .join('estudiantes as s', 'e.estudiante_id', 's.id')
        .where('e.asignacion_id', asig.id)
        .whereIn('s.curso_id', targetCursoIds)
        .count('* as total')
      const entregasCount = Number(entregasRow[0]?.total || 0)

      // Calificaciones realizadas
      const califRow = await db
        .from('calificaciones as c')
        .join('estudiantes as s', 'c.estudiante_id', 's.id')
        .where('c.asignacion_id', asig.id)
        .whereIn('s.curso_id', targetCursoIds)
        .count('* as total')
      const calificacionesCount = Number(califRow[0]?.total || 0)

      // Determinar estado global de la asignación para el filtro
      const now = DateTime.now()
      const fechaVenc = asig.fechaVencimiento ? DateTime.fromJSDate(new Date(asig.fechaVencimiento.toString())) : null
      let estadoAsignacion: 'pendiente' | 'entregada' | 'calificada' | 'vencida' = 'pendiente'
      if (calificacionesCount > 0) estadoAsignacion = 'calificada'
      else if (entregasCount > 0) estadoAsignacion = 'entregada'
      else if (fechaVenc && fechaVenc < now) estadoAsignacion = 'vencida'

      if (estadoRaw && estadoAsignacion !== estadoRaw) {
        continue
      }

      let detalleCursos: any[] | undefined
      if (detallePorCurso) {
        detalleCursos = []
        for (const cid of targetCursoIds) {
          const estRowC = await db
            .from('estudiantes')
            .where('curso_id', cid)
            .whereNull('eliminado_en')
            .count('* as total')
          const totalEstC = Number(estRowC[0]?.total || 0)

          const entregasRowC = await db
            .from('entregas as e')
            .join('estudiantes as s', 'e.estudiante_id', 's.id')
            .where('e.asignacion_id', asig.id)
            .where('s.curso_id', cid)
            .count('* as total')
          const entregasC = Number(entregasRowC[0]?.total || 0)

          detalleCursos.push({
            cursoId: cid,
            totalEstudiantes: totalEstC,
            entregas: entregasC,
            porcentajeEntrega: totalEstC > 0 ? Math.round((entregasC / totalEstC) * 100) : 0,
          })
        }
      }

      resultados.push({
        id: asig.id,
        titulo: asig.titulo,
        descripcion: asig.descripcion,
        fechaInicio: asig.fechaInicio?.toISODate?.() ?? null,
        fechaVencimiento: asig.fechaVencimiento?.toISODate?.() ?? null,
        categoria: (asig as any).$preloaded?.categoria?.nombre ?? null,
        bancoTareaId: asig.bancoTareaId,
        cursos: targetCursoIds,
        esIndividual: esIndividualSet.has(asig.id),
        estado: estadoAsignacion,
        totalEstudiantes,
        entregas: entregasCount,
        porcentajeEntrega: totalEstudiantes > 0 ? Math.round((entregasCount / totalEstudiantes) * 100) : 0,
        detallePorCurso: detalleCursos,
      })
    }

    return response.ok({
      asignaciones: resultados,
      meta: {
        page,
        perPage,
        total: paginated.total,
        lastPage: paginated.lastPage,
      },
    })
  }

  async asignacionResumen(ctx: HttpContext) {
    const { params, request, response } = ctx

    const docente = await this.getDocenteOrFail(ctx)
    if (!docente) return

    const asignacionId = Number(params.id)
    if (Number.isNaN(asignacionId)) {
      return response.badRequest({ message: 'asignacionId inválido' })
    }

    const cursoIdRaw = request.input('cursoId') ?? request.qs().cursoId ?? request.input('curso_id')
    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined
    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }

    // Confirmar que la asignación pertenece al docente
    const asig = await Asignacion.query().where('id', asignacionId).where('docente_id', docente.id).first()
    if (!asig) {
      return response.forbidden({ message: 'No tienes acceso a esta asignación' })
    }

    // Determinar cursos objetivo
    let targetCursoIds: number[] = []
    if (asig.cursoId) {
      targetCursoIds = [asig.cursoId]
    } else {
      const rows = await db.from('asignacion_cursos').where('asignacion_id', asig.id).select('curso_id')
      targetCursoIds = rows.map((r: any) => Number(r.curso_id))
    }

    // Limitar a los cursos del docente y curso filtrado
    const cursoIdsDocente = await this.getDocenteCursoIds(docente.id)
    targetCursoIds = targetCursoIds.filter((id) =>
      (cursoId !== undefined ? id === cursoId : true) && cursoIdsDocente.includes(id)
    )

    // Métricas
    const estRow = await db
      .from('estudiantes')
      .whereIn('curso_id', targetCursoIds)
      .whereNull('eliminado_en')
      .count('* as total')
    const totalEstudiantes = Number(estRow[0]?.total || 0)

    const entregasRow = await db
      .from('entregas as e')
      .join('estudiantes as s', 'e.estudiante_id', 's.id')
      .where('e.asignacion_id', asig.id)
      .whereIn('s.curso_id', targetCursoIds)
      .count('* as total')
    const entregasCount = Number(entregasRow[0]?.total || 0)

    // Calificaciones (conteo global)
    const califRow = await db
      .from('calificaciones as c')
      .join('estudiantes as s', 'c.estudiante_id', 's.id')
      .where('c.asignacion_id', asig.id)
      .whereIn('s.curso_id', targetCursoIds)
      .count('* as total')
    const calificacionesCount = Number(califRow[0]?.total || 0)

    // Detalle por curso (incluye calificaciones por curso)
    const cursosDB = await Curso.query().whereIn('id', targetCursoIds)
    const cursosMap = new Map<number, Curso>()
    for (const c of cursosDB) cursosMap.set(c.id, c)

    const detallePorCurso: any[] = []
    for (const cid of targetCursoIds) {
      const estRowC = await db
        .from('estudiantes')
        .where('curso_id', cid)
        .whereNull('eliminado_en')
        .count('* as total')
      const totalEstC = Number(estRowC[0]?.total || 0)

      const entregasRowC = await db
        .from('entregas as e')
        .join('estudiantes as s', 'e.estudiante_id', 's.id')
        .where('e.asignacion_id', asig.id)
        .where('s.curso_id', cid)
        .count('* as total')
      const entregasC = Number(entregasRowC[0]?.total || 0)

      const califRowC = await db
        .from('calificaciones as c')
        .join('estudiantes as s', 'c.estudiante_id', 's.id')
        .where('c.asignacion_id', asig.id)
        .where('s.curso_id', cid)
        .count('* as total')
      const calificacionesC = Number(califRowC[0]?.total || 0)

      detallePorCurso.push({
        cursoId: cid,
        cursoNombre: cursosMap.get(cid)?.nombre ?? null,
        totalEstudiantes: totalEstC,
        entregas: entregasC,
        calificaciones: calificacionesC,
      })
    }

    return response.ok({
      asignacion: {
        id: asig.id,
        titulo: asig.titulo,
        cursos: targetCursoIds,
        totalEstudiantes,
        entregas: entregasCount,
        calificaciones: calificacionesCount,
        porcentajeEntrega: totalEstudiantes > 0 ? Math.round((entregasCount / totalEstudiantes) * 100) : 0,
      },
      detallePorCurso,
    })
  }

}
