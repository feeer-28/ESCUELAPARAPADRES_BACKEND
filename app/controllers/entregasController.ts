import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Docente from '#models/docente'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Notificacion from '#models/notificacion'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class EntregasController {
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined

    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'acudiente') {
      return response.forbidden({ message: 'Solo un acudiente puede enviar evidencia' })
    }

    const acudiente = await Acudiente.query().where('usuario_id', usuario.id).first()
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado para este usuario' })
    }

    const asignacionId = request.input('asignacionId') ?? request.input('asignacion_id')
    const estudianteId = request.input('estudianteId') ?? request.input('estudiante_id')

    if (!asignacionId || !estudianteId) {
      return response.badRequest({ message: 'asignacionId y estudianteId son requeridos' })
    }

    const estudiante = await Estudiante.find(estudianteId)
    if (!estudiante) {
      return response.badRequest({ message: 'El estudianteId no existe' })
    }

    const estudiantePertenece = await acudiente
      .related('estudiantes')
      .query()
      .where('estudiantes.id', estudiante.id)
      .first()

    if (!estudiantePertenece) {
      return response.forbidden({ message: 'Este estudiante no está vinculado al acudiente' })
    }

    const asignacion = await Asignacion.find(asignacionId)
    if (!asignacion) {
      return response.badRequest({ message: 'La asignacionId no existe' })
    }

    let asignacionCorrespondeAlCurso = false

    if (asignacion.cursoId && asignacion.cursoId === estudiante.cursoId) {
      asignacionCorrespondeAlCurso = true
    } else {
      const match = await asignacion
        .related('cursos')
        .query()
        .where('cursos.id', estudiante.cursoId)
        .first()

      asignacionCorrespondeAlCurso = Boolean(match)
    }

    if (!asignacionCorrespondeAlCurso) {
      return response.forbidden({ message: 'La asignación no corresponde al curso del estudiante' })
    }

    const nombreEnvio = String(request.input('nombreEnvio') ?? request.input('nombre_envio') ?? '').trim()
    const evidenciaTexto = request.input('evidenciaTexto') ?? request.input('evidencia_texto')
    const archivosUrl = request.input('archivosUrl') ?? request.input('archivos_url')

    if (!nombreEnvio) {
      return response.badRequest({ message: 'nombreEnvio es requerido' })
    }

    if (!evidenciaTexto && !archivosUrl) {
      return response.badRequest({ message: 'Debes enviar evidenciaTexto o archivosUrl' })
    }

    let archivosPayload: any | null = null
    if (archivosUrl !== undefined && archivosUrl !== null && archivosUrl !== '') {
      if (typeof archivosUrl === 'string') {
        const trimmed = archivosUrl.trim()

        try {
          archivosPayload = JSON.parse(trimmed)
        } catch {
          archivosPayload = [trimmed]
        }
      } else {
        archivosPayload = archivosUrl
      }
    }

    const archivosJson = archivosPayload !== null ? JSON.stringify(archivosPayload) : null

    const entrega = await Entrega.create({
      asignacionId: Number(asignacionId),
      estudianteId: estudiante.id,
      acudienteId: acudiente.id,
      evidenciaTexto: evidenciaTexto ? String(evidenciaTexto) : null,
      archivosUrl: archivosJson,
      fechaEntrega: DateTime.now(),
      estado: 'enviada',
      institucionId: asignacion.institucionId,
      nombreEnvio,
    })

    const docente = await Docente.find(asignacion.docenteId)
    if (docente) {
      await Notificacion.create({
        destinatarioId: docente.usuarioId,
        tipo: 'entrega',
        asunto: 'Nueva evidencia enviada',
        mensaje: `Se envió evidencia para la asignación: ${asignacion.titulo}`,
        estado: 'pendiente',
        enviadoEn: DateTime.now(),
        asignacionId: asignacion.id,
        metadatos: {
          entregaId: entrega.id,
          estudianteId: estudiante.id,
          acudienteId: acudiente.id,
        },
        institucionId: asignacion.institucionId,
      })
    }

    return response.created({
      entrega,
      message: 'Evidencia enviada. Esperando revisión del docente',
    })
  }
}
