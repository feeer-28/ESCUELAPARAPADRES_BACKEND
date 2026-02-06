import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { mkdir } from 'node:fs/promises'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Notificacion from '#models/notificacion'

export default class MovilEntregasController {
  /**
   * HU-31: Enviar evidencia de tarea
   * POST /asignaciones/:id/entregas
   * Soporta: archivos multipart, URLs, y texto
   */
  async enviarEntrega(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx
      const jwtUser = (ctx as any).jwtUser || (ctx as any).authUser || (ctx as any).user
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const asignacionId = params.id
      const estudianteId = request.input('estudianteId') || request.input('estudiante_id')
      const descripcion =
        request.input('descripcion') || request.input('evidenciaTexto') || request.input('evidencia_texto')
      const archivosUrl = request.input('archivos') || request.input('archivosUrl') || request.input('archivos_url')
      const nombreEnvio = request.input('nombreEnvio') || request.input('nombre_envio')

      // ========== VALIDACIÓN: estudianteId requerido ==========
      if (!estudianteId) {
        return response.status(400).json({
          success: false,
          errors: ['El estudianteId es requerido'],
        })
      }

      // ========== VERIFICAR ACUDIENTE ==========
      const acudiente = await Acudiente.query().where('usuario_id', jwtUser.id).preload('estudiantes').first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      // ========== VERIFICAR VINCULACIÓN ACUDIENTE-ESTUDIANTE ==========
      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'Este estudiante no está vinculado a tu cuenta',
        })
      }

      // ========== VERIFICAR QUE LA ASIGNACIÓN EXISTE ==========
      const asignacion = await Asignacion.find(asignacionId)
      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'Asignación no encontrada',
        })
      }

      // ========== VERIFICAR QUE LA ASIGNACIÓN CORRESPONDE AL CURSO DEL ESTUDIANTE ==========
      const estudiante = await Estudiante.find(estudianteId)
      if (!estudiante) {
        return response.status(404).json({
          success: false,
          message: 'Estudiante no encontrado',
        })
      }

      let asignacionCorrespondeAlCurso = false
      if (asignacion.cursoId && asignacion.cursoId === estudiante.cursoId) {
        asignacionCorrespondeAlCurso = true
      } else {
        // Verificar en tabla pivote asignacion_cursos (plural)
        const match = await db
          .from('asignacion_cursos')
          .where('asignacion_id', asignacionId)
          .where('curso_id', estudiante.cursoId)
          .first()
        asignacionCorrespondeAlCurso = Boolean(match)
      }

      if (!asignacionCorrespondeAlCurso) {
        return response.status(403).json({
          success: false,
          message: 'La asignación no corresponde al curso del estudiante',
        })
      }

      // ========== VERIFICAR FECHA LÍMITE ==========
      if (asignacion.fechaVencimiento) {
        const ahora = DateTime.now()
        const fechaLimite = asignacion.fechaVencimiento

        if (ahora > fechaLimite) {
          // Calcular días de retraso
          const diasRetraso = Math.ceil(ahora.diff(fechaLimite, 'days').days)
          // Permitir entrega pero marcar como tardía (opcional)
          console.log(`Entrega tardía: ${diasRetraso} día(s) de retraso`)
        }
      }

      // ========== VERIFICAR QUE NO ESTÉ YA CALIFICADA ==========
      const calificacionExistente = await Calificacion.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()

      if (calificacionExistente) {
        return response.status(403).json({
          success: false,
          message: 'Esta tarea ya está calificada, no puedes modificarla',
        })
      }

      // ========== PROCESAR ARCHIVOS MULTIPART (UPLOAD REAL) ==========
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
      ]

      // Intentar obtener archivos de múltiples campos posibles
      const archivosMultipart = request.files('archivos', {
        size: '50mb',
        extnames: extensionesPermitidas,
      })

      const archivoUnico = request.file('archivo', {
        size: '50mb',
        extnames: extensionesPermitidas,
      })

      const archivoMultipart = request.file('file', {
        size: '50mb',
        extnames: extensionesPermitidas,
      })

      const uploadedFiles = [
        ...archivosMultipart,
        ...(archivoUnico ? [archivoUnico] : []),
        ...(archivoMultipart ? [archivoMultipart] : []),
      ]

      // ========== VALIDAR QUE HAY CONTENIDO ==========
      if (!descripcion && !archivosUrl && uploadedFiles.length === 0) {
        return response.status(400).json({
          success: false,
          errors: ['Debes agregar una descripción o al menos un archivo'],
        })
      }

      // ========== VERIFICAR SI YA EXISTE ENTREGA ==========
      let entrega = await Entrega.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()

      // Si ya existe una entrega, no permitir re-subir; devolver estado de la entrega
      if (entrega) {
        const fechaLimite = asignacion.fechaVencimiento || null
        const fechaEnt = entrega.fechaEntrega || DateTime.now()
        let estadoExistente = 'entregada'
        if (fechaLimite && fechaEnt > fechaLimite) {
          estadoExistente = 'entregada_tardia'
        }

        const archivosExistentes = (() => {
          const raw: any = (entrega as any).archivosUrl
          if (!raw) return []
          if (Array.isArray(raw)) return raw
          if (typeof raw === 'object') return raw
          if (typeof raw === 'string') {
            const s = raw.trim()
            if (!s || s === '[object Object]') return []
            if (s.startsWith('[') || s.startsWith('{')) {
              try { return JSON.parse(s) } catch { return [] }
            }
            return []
          }
          return []
        })()

        return response.status(409).json({
          success: false,
          message: 'Ya registraste una entrega para esta asignación',
          data: {
            id: entrega.id,
            descripcion: entrega.evidenciaTexto,
            fechaEntrega: entrega.fechaEntrega?.toISO(),
            archivos: archivosExistentes,
            estado: estadoExistente,
            nombreEnvio: entrega.nombreEnvio,
          },
        })
      }

      // ========== PROCESAR URLs DE ARCHIVOS (si vienen como string/array) ==========
      let archivosPayload: any[] = []
      if (archivosUrl) {
        if (typeof archivosUrl === 'string') {
          try {
            archivosPayload = JSON.parse(archivosUrl)
          } catch {
            archivosPayload = [archivosUrl]
          }
        } else if (Array.isArray(archivosUrl)) {
          archivosPayload = archivosUrl
        }
      }

      // ========== SUBIR ARCHIVOS MULTIPART AL SERVIDOR ==========
      const uploadedPayload: Array<{
        originalName: string
        fileName: string
        extname: string
        size: number
        mimeType: string
        url: string
      }> = []

      if (uploadedFiles.length > 0) {
        // Crear entrega primero para tener el ID
        if (!entrega) {
          entrega = await Entrega.create({
            asignacionId: Number(asignacionId),
            estudianteId: Number(estudianteId),
            acudienteId: acudiente.id,
            evidenciaTexto: descripcion || null,
            archivosUrl: null,
            fechaEntrega: DateTime.now(),
            estado: 'enviada',
            institucionId: asignacion.institucionId,
            nombreEnvio: nombreEnvio || `${acudiente.nombres} ${acudiente.apellidos}`,
          })
        }

        const relativeFolder = `uploads/entregas/${entrega.id}`
        const absoluteFolder = app.makePath('public', relativeFolder)
        await mkdir(absoluteFolder, { recursive: true })

        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i]

          if (!file.isValid) {
            return response.status(400).json({
              success: false,
              message: 'Uno o más archivos no son válidos',
              errors: file.errors,
            })
          }

          const safeClientName = String(file.clientName || 'archivo')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 80)

          const name = `${Date.now()}_${i}_${safeClientName}`
          await file.move(absoluteFolder, { name })

          const url = `/${relativeFolder}/${name}`
          uploadedPayload.push({
            originalName: file.clientName,
            fileName: name,
            extname: file.extname || '',
            size: file.size,
            mimeType: file.type ? `${file.type}/${file.subtype || ''}`.replace(/\/$/, '') : '',
            url,
          })
        }
      }

      // ========== COMBINAR ARCHIVOS ==========
      const combined = [...archivosPayload, ...uploadedPayload]
      const archivosJson = combined.length > 0 ? JSON.stringify(combined) : null

      // ========== CREAR O ACTUALIZAR ENTREGA ==========
      if (entrega) {
        // Actualizar entrega existente
        if (descripcion) entrega.evidenciaTexto = descripcion
        if (archivosJson) {
          // Combinar archivos existentes con nuevos (parseo seguro)
          const existentes = (() => {
            const raw: any = (entrega as any).archivosUrl
            if (!raw) return []
            if (Array.isArray(raw)) return raw
            if (typeof raw === 'object') return raw
            if (typeof raw === 'string') {
              const s = raw.trim()
              if (!s || s === '[object Object]') return []
              if (s.startsWith('[') || s.startsWith('{')) {
                try {
                  return JSON.parse(s)
                } catch {
                  return []
                }
              }
              return []
            }
            return []
          })()
          const todos = [...existentes, ...combined]
          entrega.archivosUrl = JSON.stringify(todos)
        }
        entrega.fechaEntrega = DateTime.now()
        if (nombreEnvio) entrega.nombreEnvio = nombreEnvio
        await entrega.save()
      } else {
        // Crear nueva entrega
        entrega = await Entrega.create({
          asignacionId: Number(asignacionId),
          estudianteId: Number(estudianteId),
          acudienteId: acudiente.id,
          evidenciaTexto: descripcion || null,
          archivosUrl: archivosJson,
          fechaEntrega: DateTime.now(),
          estado: 'enviada',
          institucionId: asignacion.institucionId,
          nombreEnvio: nombreEnvio || `${acudiente.nombres} ${acudiente.apellidos}`,
        })
      }

      // ========== NOTIFICAR AL DOCENTE ==========
      if (asignacion.docenteId) {
        const docente = await db.from('docentes').where('id', asignacion.docenteId).first()
        if (docente) {
          await Notificacion.create({
            destinatarioId: docente.usuario_id,
            tipo: 'entrega',
            asunto: 'Nueva evidencia recibida',
            mensaje: `Se recibió evidencia para: ${asignacion.titulo}`,
            estado: 'pendiente',
            enviadoEn: DateTime.now(),
            asignacionId: asignacion.id,
            institucionId: asignacion.institucionId,
          })
        }
      }

      // ========== DETERMINAR ESTADO ==========
      let estadoEntrega = 'entregada'
      const ahoraFinal = DateTime.now()
      if (asignacion.fechaVencimiento && ahoraFinal > asignacion.fechaVencimiento) {
        estadoEntrega = 'entregada_tardia'
      }

      // ========== CALIFICACIÓN AUTOMÁTICA ==========
      // Regla: 5.0 si está en fecha; baja 0.1 por cada día de retraso.
      const fechaLimiteAuto = asignacion.fechaVencimiento || null
      let diasRetrasoAuto = 0
      if (fechaLimiteAuto && ahoraFinal > fechaLimiteAuto) {
        diasRetrasoAuto = Math.ceil(ahoraFinal.diff(fechaLimiteAuto, 'days').days)
      }
      const notaCalculada = Math.max(0, Number((5.0 - 0.1 * diasRetrasoAuto).toFixed(1)))
      const escalaCalculada = (() => {
        if (notaCalculada >= 4.6) return 'Superior'
        if (notaCalculada >= 4.0) return 'Alto'
        if (notaCalculada >= 3.0) return 'Básico'
        if (notaCalculada > 0) return 'Bajo'
        return 'Bajo'
      })()

      // Evitar duplicados por seguridad
      const yaCalificada = await Calificacion.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()

      if (!yaCalificada) {
        await Calificacion.create({
          entregaId: entrega.id,
          estudianteId: Number(estudianteId),
          asignacionId: Number(asignacionId),
          nota: notaCalculada,
          escala: escalaCalculada,
          notaCualitativa: null,
          retroalimentacion: 'Calificación automática por entrega registrada',
          calificadoPor: asignacion.docenteId || 0,
          calificadoEn: DateTime.now(),
          periodoId: (asignacion as any).periodoId,
          institucionId: asignacion.institucionId || null,
          esAutomatica: true,
        })
      }

      return response.status(201).json({
        success: true,
        message: 'Evidencia enviada correctamente',
        data: {
          id: entrega.id,
          descripcion: entrega.evidenciaTexto,
          fechaEntrega: entrega.fechaEntrega?.toISO(),
          archivos: (() => {
            const raw: any = (entrega as any).archivosUrl
            if (!raw) return []
            if (Array.isArray(raw)) return raw
            if (typeof raw === 'object') return raw
            if (typeof raw === 'string') {
              const s = raw.trim()
              if (!s || s === '[object Object]') return []
              if (s.startsWith('[') || s.startsWith('{')) {
                try {
                  return JSON.parse(s)
                } catch {
                  return []
                }
              }
              return []
            }
            return []
          })(),
          estado: estadoEntrega,
          nombreEnvio: entrega.nombreEnvio,
          calificacion: {
            nota: notaCalculada,
            escala: escalaCalculada,
            esAutomatica: true,
          },
        },
      })
    } catch (error) {
      console.error('Error al enviar entrega:', error)
      return ctx.response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-33: Editar entrega antes de la fecha límite
   * PUT /entregas/:id
   */
  async editarEntrega({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const entregaId = params.id
      const descripcion = request.input('descripcion') || request.input('evidenciaTexto')
      const archivosNuevos = request.input('archivosNuevos')
      const archivosEliminar = request.input('archivosEliminar') || []

      const entrega = await Entrega.query().where('id', entregaId).preload('asignacion').first()

      if (!entrega) {
        return response.status(404).json({
          success: false,
          message: 'Entrega no encontrada',
        })
      }

      // Verificar que pertenece a un estudiante del acudiente
      const acudiente = await Acudiente.query().where('usuario_id', jwtUser.id).preload('estudiantes').first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === entrega.estudianteId)
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para editar esta entrega',
        })
      }

      // Verificar que no esté calificada
      const calificacion = await Calificacion.query().where('entrega_id', entregaId).first()

      if (calificacion) {
        return response.status(403).json({
          success: false,
          message: 'No puedes editar una entrega calificada',
        })
      }

      // Verificar que no esté vencida
      if (entrega.asignacion?.fechaVencimiento) {
        const fechaVenc = DateTime.fromJSDate(new Date(entrega.asignacion.fechaVencimiento.toString()))
        if (fechaVenc < DateTime.now()) {
          return response.status(403).json({
            success: false,
            message: 'No puedes editar una entrega vencida',
          })
        }
      }

      // Actualizar descripción
      if (descripcion !== undefined) {
        entrega.evidenciaTexto = descripcion
      }

      // Manejar archivos (parseo seguro de archivosUrl)
      let archivosActuales = (() => {
        const raw: any = (entrega as any).archivosUrl
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'object') return raw
        if (typeof raw === 'string') {
          const s = raw.trim()
          if (!s || s === '[object Object]') return []
          if (s.startsWith('[') || s.startsWith('{')) {
            try {
              return JSON.parse(s)
            } catch {
              return []
            }
          }
          return []
        }
        return []
      })()

      // Eliminar archivos marcados
      if (archivosEliminar.length > 0) {
        archivosActuales = archivosActuales.filter((_: any, index: number) => !archivosEliminar.includes(index))
      }

      // Agregar nuevos archivos
      if (archivosNuevos) {
        archivosActuales = [...archivosActuales, ...archivosNuevos]
      }

      entrega.archivosUrl = JSON.stringify(archivosActuales)
      entrega.actualizadoEn = DateTime.now()
      await entrega.save()

      return response.status(200).json({
        success: true,
        message: 'Entrega actualizada',
      })
    } catch (error) {
      console.error('Error al editar entrega:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }
}
