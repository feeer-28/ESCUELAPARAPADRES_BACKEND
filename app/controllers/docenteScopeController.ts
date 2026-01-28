import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

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

    const cursoId = cursoIdRaw !== undefined ? Number(cursoIdRaw) : undefined
    const asignacionId = asignacionIdRaw !== undefined ? Number(asignacionIdRaw) : undefined

    if (cursoId !== undefined && Number.isNaN(cursoId)) {
      return response.badRequest({ message: 'cursoId inválido' })
    }

    if (asignacionId !== undefined && Number.isNaN(asignacionId)) {
      return response.badRequest({ message: 'asignacionId inválido' })
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
      return response.ok({ entregas: [] })
    }

    const entregasQuery = Entrega.query()
      .whereIn('asignacion_id', asignacionIds)
      .preload('asignacion')
      .preload('estudiante')
      .preload('acudiente')
      .preload('calificacion')
      .orderBy('id', 'desc')

    if (onlyPending) {
      entregasQuery.where('estado', 'enviada').whereDoesntHave('calificacion')
    }

    const entregas = await entregasQuery

    return response.ok({ entregas })
  }
}
