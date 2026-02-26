import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import Asignacion from '#models/asignacion'
import BancoTarea from '#models/banco_tarea'
import Categoria from '#models/categoria'
import Docente from '#models/docente'
import Estudiante from '#models/estudiante'
import Funcionario from '#models/funcionario'
import Periodo from '#models/periodo'
import Role from '#models/role'
import Usuario from '#models/usuario'
import MovilController from '#controllers/movilController'

export default class AsignacionesEspecialesController {
  private async ensureOwnerDocente(usuario: Usuario, periodoId: number) {
    let docente = await Docente.query().where('usuario_id', usuario.id).first()
    if (docente) return docente
    const func = await Funcionario.query().where('usuario_id', usuario.id).first()
    const institucionIdInferida = func?.institucionId ?? (await Periodo.find(periodoId))!.institucionId
    docente = await Docente.create({
      nombres: func?.nombre ?? 'Orientador',
      apellidos: func?.apellido ?? 'Del Sistema',
      tipoDocumento: 'N/A',
      numeroDocumento: `orientador-${usuario.id}`,
      telefono: '0000000000',
      correo: `orientador_${usuario.id}@placeholder.local`,
      institucionId: institucionIdInferida!,
      usuarioId: usuario.id,
    })
    return docente
  }

  private async createIndividualAssignment(ctx: HttpContext) {
    const { request, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    if (!usuario) return response.unauthorized({ message: 'No autenticado' })

    const bancoTareaId = request.input('bancoTareaId') ?? request.input('banco_tarea_id')
    const periodoId = Number(request.input('periodoId') ?? request.input('periodo_id'))
    const estudianteIdsInput = request.input('estudianteIds') ?? request.input('estudiante_ids')
    const fechaInicioRaw = request.input('fechaInicio') ?? request.input('fecha_inicio')
    const fechaVencimientoRaw = request.input('fechaVencimiento') ?? request.input('fecha_vencimiento')

    if (!bancoTareaId) return response.badRequest({ message: 'bancoTareaId es requerido' })
    if (!periodoId) return response.badRequest({ message: 'periodoId es requerido' })

    const idsEstudiantes: number[] = Array.isArray(estudianteIdsInput)
      ? (estudianteIdsInput as any[]).map((x) => Number(x))
      : estudianteIdsInput !== undefined && estudianteIdsInput !== null && estudianteIdsInput !== ''
      ? [Number(estudianteIdsInput)]
      : []

    if (!idsEstudiantes.length || idsEstudiantes.some((id) => Number.isNaN(id))) {
      return response.badRequest({ message: 'estudianteIds es requerido y debe ser válido' })
    }

    const bancoTarea = await BancoTarea.find(bancoTareaId)
    if (!bancoTarea) return response.badRequest({ message: 'La bancoTareaId no existe' })

    const periodo = await Periodo.find(periodoId)
    if (!periodo) return response.badRequest({ message: 'El periodoId no existe' })

    const categoriaId = bancoTarea.categoriaId
    const categoria = await Categoria.find(categoriaId)
    if (!categoria) return response.badRequest({ message: 'La categoriaId de la tarea no existe' })

    const ests = await Estudiante.query().whereIn('id', idsEstudiantes)
    if (ests.length !== idsEstudiantes.length) {
      return response.badRequest({ message: 'Uno o más estudianteIds no existen' })
    }

    const fechaInicio = fechaInicioRaw ? DateTime.fromISO(String(fechaInicioRaw)) : DateTime.now().startOf('day')
    if (!fechaInicio.isValid) return response.badRequest({ message: 'fechaInicio inválida (usa ISO: YYYY-MM-DD)' })
    const fechaVencimiento = fechaVencimientoRaw ? DateTime.fromISO(String(fechaVencimientoRaw)) : null
    if (fechaVencimientoRaw && !fechaVencimiento?.isValid)
      return response.badRequest({ message: 'fechaVencimiento inválida (usa ISO: YYYY-MM-DD)' })

    const frecuencia = String(request.input('frecuencia') ?? 'unica')
    const incluirEnBoletin = Boolean(request.input('incluirEnBoletin') ?? request.input('incluir_en_boletin') ?? false)

    const docenteOwner = await this.ensureOwnerDocente(usuario, periodoId)

    const asignacion = await Asignacion.create({
      titulo: String(request.input('titulo') ?? bancoTarea.titulo),
      descripcion: String(request.input('descripcion') ?? bancoTarea.descripcion),
      frecuencia,
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

    const rows = idsEstudiantes.map((eid) => ({ asignacion_id: asignacion.id, estudiante_id: eid }))
    await db.table('asignacion_estudiantes').multiInsert(rows)

    // Notificar a acudientes de esos estudiantes
    const estudiantes = await Estudiante.query().whereIn('id', idsEstudiantes).preload('acudientes', (q) => q.preload('usuario'))
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

    return response.created(asignacion)
  }

  async store(ctx: HttpContext) {
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    const rol = usuario ? await Role.find(usuario.rolId) : null
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      return ctx.response.forbidden({ message: 'No tienes permiso para asignar tareas' })
    }
    return this.createIndividualAssignment(ctx)
  }

  async storeOrientador(ctx: HttpContext) {
    const usuario = (ctx as any).jwtUser as Usuario | undefined
    const rol = usuario ? await Role.find(usuario.rolId) : null
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'orientador') {
      return ctx.response.forbidden({ message: 'No tienes permiso para asignar tareas como orientador' })
    }
    return this.createIndividualAssignment(ctx)
  }
}
