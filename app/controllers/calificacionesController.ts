import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Notificacion from '#models/notificacion'
import Role from '#models/role'
import Usuario from '#models/usuario'

function clampNota(value: number) {
  if (value < 1.0) return 1.0
  if (value > 5.0) return 5.0
  return value
}

function computeNotaAutomatica(asignacion: Asignacion, entregaFecha: DateTime) {
  if (!asignacion.fechaVencimiento) return 5.0

  const due = asignacion.fechaVencimiento.startOf('day')
  const delivered = entregaFecha.startOf('day')

  const daysLate = Math.max(0, Math.floor(delivered.diff(due, 'days').days))
  const steps = Math.floor(daysLate / 10)
  const nota = 5.0 - steps * 0.1

  return clampNota(Math.round(nota * 10) / 10)
}

export default class CalificacionesController {
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined

    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente' && nombreRol !== 'orientador') {
      return response.forbidden({ message: 'No tienes permiso para calificar' })
    }

    const entregaId = request.input('entregaId') ?? request.input('entrega_id')
    if (!entregaId) {
      return response.badRequest({ message: 'entregaId es requerido' })
    }

    const entrega = await Entrega.find(entregaId)
    if (!entrega) {
      return response.notFound({ message: 'Entrega no encontrada' })
    }

    const asignacion = await Asignacion.find(entrega.asignacionId)
    if (!asignacion) {
      return response.badRequest({ message: 'La asignación de la entrega no existe' })
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
        return response.badRequest({ message: 'docenteId es requerido cuando el rol es orientador' })
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

    const notaInput = request.input('nota')
    const notaCualitativa = request.input('notaCualitativa') ?? request.input('nota_cualitativa')
    const retroalimentacion = request.input('retroalimentacion')

    let nota: number | null = null
    let esAutomatica = false

    if (notaInput !== undefined && notaInput !== null && notaInput !== '') {
      const parsed = Number(notaInput)
      if (Number.isNaN(parsed)) {
        return response.badRequest({ message: 'nota inválida' })
      }
      nota = clampNota(parsed)
      esAutomatica = false
    } else {
      nota = computeNotaAutomatica(asignacion, entrega.fechaEntrega)
      esAutomatica = true
    }

    const escala = String(request.input('escala') ?? '1-5')

    const existente = await Calificacion.query().where('entrega_id', entrega.id).first()

    let calificacion: Calificacion
    if (existente) {
      existente.merge({
        nota,
        escala,
        notaCualitativa: notaCualitativa ? String(notaCualitativa) : null,
        retroalimentacion: retroalimentacion ? String(retroalimentacion) : null,
        calificadoPor: docenteId!,
        calificadoEn: DateTime.now(),
        periodoId: asignacion.periodoId,
        institucionId: asignacion.institucionId,
        esAutomatica,
      })
      await existente.save()
      calificacion = existente
    } else {
      calificacion = await Calificacion.create({
        entregaId: entrega.id,
        estudianteId: entrega.estudianteId,
        asignacionId: entrega.asignacionId,
        nota,
        escala,
        notaCualitativa: notaCualitativa ? String(notaCualitativa) : null,
        retroalimentacion: retroalimentacion ? String(retroalimentacion) : null,
        calificadoPor: docenteId!,
        calificadoEn: DateTime.now(),
        periodoId: asignacion.periodoId,
        institucionId: asignacion.institucionId,
        esAutomatica,
      })
    }

    entrega.estado = 'calificada'
    await entrega.save()

    const acudiente = await Acudiente.find(entrega.acudienteId)
    if (acudiente) {
      await Notificacion.create({
        destinatarioId: acudiente.usuarioId,
        tipo: 'calificacion',
        asunto: 'Tu entrega fue calificada',
        mensaje: `Tu entrega fue calificada para la asignación: ${asignacion.titulo}`,
        estado: 'pendiente',
        enviadoEn: DateTime.now(),
        asignacionId: asignacion.id,
        metadatos: {
          entregaId: entrega.id,
          calificacionId: calificacion.id,
          nota: calificacion.nota,
          notaCualitativa: calificacion.notaCualitativa,
        },
        institucionId: asignacion.institucionId,
      })
    }

    return response.ok({
      message: 'Calificación guardada',
      calificacion,
      entrega,
    })
  }
}
