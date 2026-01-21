import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import Asignacion from '#models/asignacion'
import BancoTarea from '#models/banco_tarea'
import Categoria from '#models/categoria'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Periodo from '#models/periodo'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class AsignacionesController {
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
      if (!docenteIdFromBody) {
        return response.badRequest({
          message: 'docenteId es requerido cuando el rol es orientador',
        })
      }
      docenteId = Number(docenteIdFromBody)
      if (Number.isNaN(docenteId)) {
        return response.badRequest({ message: 'docenteId inválido' })
      }

      const docente = await Docente.find(docenteId)
      if (!docente) {
        return response.badRequest({ message: 'El docenteId no existe' })
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

    return response.created(asignacion)
  }
}
