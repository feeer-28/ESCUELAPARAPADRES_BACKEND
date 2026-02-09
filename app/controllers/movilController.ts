import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { mkdir } from 'node:fs/promises'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Notificacion from '#models/notificacion'
import Usuario from '#models/usuario'
import env from '#start/env'
  import { getMessaging } from '#config/firebase'
import { schema, validator } from '@adonisjs/validator'

export default class MovilController {
  // ============================================================
  // EP-07: AUTENTICACIÓN Y GESTIÓN DE PERFIL
  // ============================================================

  /**
   * HU-22: Login móvil para acudientes
   * POST /auth/login/movil
   */
  async loginMovil({ request, response }: HttpContext) {
    try {
      const documento = String(request.input('documento') ?? '').trim()
      const password = String(request.input('password') ?? '').trim()

      if (!documento || !password) {
        return response.status(400).json({
          success: false,
          message: 'Documento y contraseña son requeridos',
        })
      }

      // Buscar acudiente por número de documento
      const acudiente = await Acudiente.query()
        .where('numero_documento', documento)
        .preload('usuario', (query) => {
          query.preload('rol')
        })
        .preload('estudiantes', (query) => {
          query.preload('curso', (q) => {
            q.preload('grado')
            q.preload('institucion')
          })
        })
        .first()

      if (!acudiente) {
        return response.status(401).json({
          success: false,
          message: 'Documento o contraseña incorrectos',
        })
      }

      const usuario = acudiente.usuario
      if (!usuario) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no encontrado para este acudiente',
        })
      }

      // Verificar que sea rol acudiente (rolId: 6)
      if (usuario.rolId !== 6) {
        return response.status(401).json({
          success: false,
          message: 'Este acceso es solo para acudientes',
        })
      }

      // Verificar que esté activo
      if (!usuario.estaActivo) {
        return response.status(403).json({
          success: false,
          message: 'Usuario desactivado. Contacta al administrador.',
        })
      }

      // Verificar contraseña
      const isPasswordValid = await hash.verify(usuario.contrasenaHash, password)
      if (!isPasswordValid) {
        return response.status(401).json({
          success: false,
          message: 'Documento o contraseña incorrectos',
        })
      }

      // Actualizar último ingreso
      usuario.ultimoIngreso = DateTime.now()
      await usuario.save()

      // Generar token JWT
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      const token = jwt.sign(
        {
          sub: usuario.id,
          correo: usuario.correo,
          rolId: usuario.rolId,
          acudienteId: acudiente.id,
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      // Formatear estudiantes vinculados
      const estudiantes = acudiente.estudiantes.map((est) => {
        return {
          id: est.id,
          firstName: est.nombres,
          lastName: est.apellidos,
          documento: est.numeroDocumento,
          foto: null, // Campo para foto si existe
          curso: {
            id: est.curso?.id,
            name: est.curso?.nombre,
            grado: est.curso?.grado?.nombre,
            jornada: est.curso?.jornada || 'No especificada',
          },
          institucion: {
            id: est.curso?.institucion?.id,
            name: est.curso?.institucion?.nombre,
          },
          parentesco: est.$extras.pivot_relacion || acudiente.parentesco || 'Acudiente',
          esPrincipal: est.$extras.pivot_es_principal || false,
        }
      })

      return response.status(200).json({
        success: true,
        token,
        user: {
          id: usuario.id,
          documento: acudiente.numeroDocumento,
          firstName: acudiente.nombres,
          lastName: acudiente.apellidos,
          phone: acudiente.telefono,
          email: acudiente.correo || usuario.correo,
          roleId: 'acudiente',
          mustChangePassword: usuario.debeCambiarContrasena,
          lastLogin: usuario.ultimoIngreso?.toISO(),
        },
        estudiantes,
      })
    } catch (error) {
      console.error('Error en login móvil:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * HU-24: Cambiar contraseña obligatoriamente
   * POST /auth/cambiar-password
   */
  async cambiarPassword({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const currentPassword = String(request.input('currentPassword') ?? '').trim()
      const newPassword = String(request.input('newPassword') ?? '').trim()
      const confirmPassword = String(request.input('confirmPassword') ?? '').trim()

      const errors: string[] = []

      if (!currentPassword) errors.push('La contraseña actual es requerida')
      if (!newPassword) errors.push('La nueva contraseña es requerida')
      if (!confirmPassword) errors.push('La confirmación de contraseña es requerida')

      if (errors.length > 0) {
        return response.status(400).json({ success: false, errors })
      }

      // Validar que coincidan
      if (newPassword !== confirmPassword) {
        return response.status(400).json({
          success: false,
          errors: ['Las contraseñas no coinciden'],
        })
      }

      const usuario = await Usuario.find(jwtUser.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Verificar contraseña actual
      const isCurrentValid = await hash.verify(usuario.contrasenaHash, currentPassword)
      if (!isCurrentValid) {
        return response.status(400).json({
          success: false,
          errors: ['La contraseña actual es incorrecta'],
        })
      }

      // Obtener documento del acudiente para validar
      const acudiente = await Acudiente.query().where('usuario_id', usuario.id).first()

      // Validar que nueva contraseña no sea el documento
      if (acudiente && newPassword === acudiente.numeroDocumento) {
        return response.status(400).json({
          success: false,
          errors: ['La nueva contraseña no puede ser tu número de documento'],
        })
      }

      // Validar que no sea igual a la actual
      if (newPassword === currentPassword) {
        return response.status(400).json({
          success: false,
          errors: ['La nueva contraseña debe ser diferente a la actual'],
        })
      }

      // Validar requisitos de seguridad: 8+ chars, 1 mayúscula, 1 número, 1 especial
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
      if (!passwordRegex.test(newPassword)) {
        return response.status(400).json({
          success: false,
          errors: [
            'La nueva contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial',
          ],
        })
      }

      // Actualizar contraseña
      usuario.contrasenaHash = newPassword // El hook del modelo lo hashea
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Contraseña actualizada correctamente',
      })
    } catch (error) {
      console.error('Error al cambiar contraseña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * HU-25: Recuperar contraseña - Solicitar OTP
   * POST /auth/recuperar/solicitar
   */
  async recuperarSolicitar({ request, response }: HttpContext) {
    try {
      const contacto = String(request.input('contacto') ?? '').trim()

      if (!contacto) {
        return response.status(400).json({
          success: false,
          message: 'El contacto (teléfono o email) es requerido',
        })
      }

      // Buscar por teléfono o correo
      const acudiente = await Acudiente.query()
        .where('telefono', contacto)
        .orWhere('correo', contacto)
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'No encontramos una cuenta con ese dato',
        })
      }

      // Generar código OTP de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString()
      const expiraEn = 900 // 15 minutos en segundos

      // TODO: En producción, guardar OTP en tabla otp_codes o cache Redis
      // Por ahora solo se genera y se simula el envío

      // Determinar método (SMS o email)
      const metodo = contacto.includes('@') ? 'email' : 'sms'

      // TODO: Integrar con servicio SMS/Email real
      // Por ahora solo simulamos el envío
      console.log(`[OTP] Código ${codigo} enviado a ${contacto} vía ${metodo}`)

      return response.status(200).json({
        success: true,
        message: `Código enviado a tu ${metodo === 'sms' ? 'teléfono' : 'correo'}`,
        metodo,
        expiraEn,
        // En desarrollo, retornamos el código para pruebas
        ...(env.get('NODE_ENV') !== 'production' && { codigoDebug: codigo }),
      })
    } catch (error) {
      console.error('Error al solicitar recuperación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-25: Recuperar contraseña - Verificar OTP
   * POST /auth/recuperar/verificar
   */
  async recuperarVerificar({ request, response }: HttpContext) {
    try {
      const contacto = String(request.input('contacto') ?? '').trim()
      const codigo = String(request.input('codigo') ?? '').trim()

      if (!contacto || !codigo) {
        return response.status(400).json({
          success: false,
          message: 'Contacto y código son requeridos',
        })
      }

      // TODO: Verificar código contra BD/cache
      // Por ahora aceptamos cualquier código de 6 dígitos en desarrollo
      if (codigo.length !== 6) {
        return response.status(400).json({
          success: false,
          message: 'Código inválido',
        })
      }

      // Generar token temporal para el paso 3
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      const resetToken = jwt.sign({ contacto, purpose: 'password_reset' }, jwtSecret, {
        expiresIn: '15m',
      })

      return response.status(200).json({
        success: true,
        token: resetToken,
      })
    } catch (error) {
      console.error('Error al verificar código:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-25: Recuperar contraseña - Restablecer
   * POST /auth/recuperar/restablecer
   */
  async recuperarRestablecer({ request, response }: HttpContext) {
    try {
      const token = String(request.input('token') ?? '').trim()
      const newPassword = String(request.input('newPassword') ?? '').trim()
      const confirmPassword = String(request.input('confirmPassword') ?? '').trim()

      if (!token || !newPassword || !confirmPassword) {
        return response.status(400).json({
          success: false,
          message: 'Token y contraseñas son requeridos',
        })
      }

      if (newPassword !== confirmPassword) {
        return response.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden',
        })
      }

      // Validar requisitos de seguridad
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
      if (!passwordRegex.test(newPassword)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 especial',
        })
      }

      // Verificar y decodificar token
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      let decoded: any
      try {
        decoded = jwt.verify(token, jwtSecret)
      } catch {
        return response.status(400).json({
          success: false,
          message: 'El enlace ha expirado. Solicita uno nuevo',
        })
      }

      if (decoded.purpose !== 'password_reset') {
        return response.status(400).json({
          success: false,
          message: 'Token inválido',
        })
      }

      // Buscar acudiente por contacto
      const contacto = decoded.contacto
      const acudiente = await Acudiente.query()
        .where('telefono', contacto)
        .orWhere('correo', contacto)
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      const usuario = await Usuario.find(acudiente.usuarioId)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Actualizar contraseña
      usuario.contrasenaHash = newPassword
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Contraseña restablecida. Ya puedes iniciar sesión',
      })
    } catch (error) {
      console.error('Error al restablecer contraseña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-26: Lista de hijos vinculados
   * GET /acudientes/mis-estudiantes
   */
  async misEstudiantes({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes', (query) => {
          query.preload('curso', (q) => {
            q.preload('grado')
            q.preload('institucion')
          })
        })
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      const data = acudiente.estudiantes.map((est) => ({
        id: est.id,
        firstName: est.nombres,
        lastName: est.apellidos,
        documento: est.numeroDocumento,
        foto: null,
        curso: {
          id: est.curso?.id,
          name: est.curso?.nombre,
          grado: est.curso?.grado?.nombre,
          jornada: est.curso?.jornada || 'No especificada',
        },
        institucion: {
          id: est.curso?.institucion?.id,
          name: est.curso?.institucion?.nombre,
        },
        parentesco: est.$extras.pivot_relacion || acudiente.parentesco || 'Acudiente',
        esPrincipal: est.$extras.pivot_es_principal || false,
      }))

      // Ordenar: principal primero, luego alfabético
      data.sort((a, b) => {
        if (a.esPrincipal && !b.esPrincipal) return -1
        if (!a.esPrincipal && b.esPrincipal) return 1
        return a.firstName.localeCompare(b.firstName)
      })

      return response.status(200).json({
        success: true,
        data,
      })
    } catch (error) {
      console.error('Error al obtener estudiantes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-27: Perfil completo del estudiante
   * GET /estudiantes/:id/perfil
   */
  async perfilEstudiante({ params, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const rawEstudianteId = params.id

      // Verificar que el estudiante está vinculado al acudiente
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      // Resolver estudianteId: soportar alias 'me' y validar numérico
      let estudianteIdResolved: number | null = null
      if (rawEstudianteId === 'me') {
        estudianteIdResolved = acudiente.estudiantes[0]?.id || null
      } else {
        const parsed = Number(rawEstudianteId)
        estudianteIdResolved = Number.isFinite(parsed) ? parsed : null
      }

      if (!estudianteIdResolved) {
        return response.status(400).json({
          success: false,
          message: 'Parámetro estudiante id inválido o no disponible',
        })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === estudianteIdResolved)
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      // Obtener estudiante con relaciones
      const estudiante = await Estudiante.query()
        .where('id', estudianteIdResolved)
        .preload('curso', (q) => {
          q.preload('grado')
          q.preload('institucion')
        })
        .firstOrFail()

      // Obtener período activo
      const periodoActivo = await db
        .from('periodos')
        .where('esta_activo', true)
        .orderBy('id', 'desc')
        .first()

      // Calcular estadísticas del período activo
      let estadisticas = {
        totalTareas: 0,
        tareasCompletadas: 0,
        promedio: 0,
        escala: 'Sin datos',
      }

      if (periodoActivo) {
        // Contar asignaciones del curso en el período
        const asignaciones = await db
          .from('asignaciones')
          .where('periodo_id', periodoActivo.id)
          .where((query) => {
            query.where('curso_id', estudiante.cursoId).orWhereIn(
              'id',
              db
                .from('asignacion_cursos')
                .where('curso_id', estudiante.cursoId)
                .select('asignacion_id')
            )
          })
          .count('* as total')

        estadisticas.totalTareas = Number(asignaciones[0]?.total || 0)

        // Contar entregas realizadas
        const entregas = await db
          .from('entregas')
          .where('estudiante_id', estudianteIdResolved)
          .whereIn(
            'asignacion_id',
            db
              .from('asignaciones')
              .where('periodo_id', periodoActivo.id)
              .select('id')
          )
          .count('* as total')

        estadisticas.tareasCompletadas = Number(entregas[0]?.total || 0)

        // Calcular promedio
        const calificaciones = await db
          .from('calificaciones')
          .where('estudiante_id', estudianteIdResolved)
          .where('periodo_id', periodoActivo.id)
          .whereNotNull('nota')
          .avg('nota as promedio')

        const promedio = calificaciones[0]?.promedio
          ? parseFloat(Number(calificaciones[0].promedio).toFixed(1))
          : 0

        estadisticas.promedio = promedio

        // Determinar escala
        if (promedio >= 4.6) estadisticas.escala = 'Superior'
        else if (promedio >= 4.0) estadisticas.escala = 'Alto'
        else if (promedio >= 3.0) estadisticas.escala = 'Básico'
        else if (promedio > 0) estadisticas.escala = 'Bajo'
      }

      // Calcular edad
      const edad = estudiante.fechaNacimiento
        ? Math.floor(DateTime.now().diff(estudiante.fechaNacimiento, 'years').years)
        : null

      return response.status(200).json({
        success: true,
        data: {
          id: estudiante.id,
          firstName: estudiante.nombres,
          lastName: estudiante.apellidos,
          documento: estudiante.numeroDocumento,
          tipoDocumento: estudiante.tipoDocumento,
          fechaNacimiento: estudiante.fechaNacimiento?.toISODate(),
          edad,
          sexo: estudiante.sexo,
          foto: null,
          datosMedicos: {
            grupoSanguineo: estudiante.grupoSanguineo,
            rh: estudiante.rh,
            eps: estudiante.eps,
          },
          datosAcademicos: {
            institucion: estudiante.curso?.institucion?.nombre,
            curso: estudiante.curso?.nombre,
            grado: estudiante.curso?.grado?.nombre,
            jornada: estudiante.curso?.jornada || 'No especificada',
          },
          estadisticas,
        },
      })
    } catch (error) {
      console.error('Error al obtener perfil:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  // ============================================================
  // EP-08: VISUALIZACIÓN Y ENVÍO DE TAREAS
  // ============================================================

  /**
   * HU-28: Lista de tareas asignadas al estudiante
   * GET /estudiantes/:id/tareas
   */
  async tareasEstudiante({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const rawEstudianteId = params.id
      const periodoId = request.input('periodo')

      // Verificar vinculación
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      // Resolver estudianteId: soportar alias 'me' y validar numérico
      let estudianteIdResolved: number | null = null
      if (rawEstudianteId === 'me') {
        estudianteIdResolved = acudiente.estudiantes[0]?.id || null
      } else {
        const parsed = Number(rawEstudianteId)
        estudianteIdResolved = Number.isFinite(parsed) ? parsed : null
      }

      if (!estudianteIdResolved) {
        return response.status(400).json({
          success: false,
          message: 'Parámetro estudiante id inválido o no disponible',
        })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === estudianteIdResolved)
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      const estudiante = await Estudiante.find(estudianteIdResolved)
      if (!estudiante) {
        return response.status(404).json({
          success: false,
          message: 'Estudiante no encontrado',
        })
      }

      // Obtener período (activo o el especificado)
      let periodo
      if (periodoId) {
        periodo = await db.from('periodos').where('id', periodoId).first()
      } else {
        periodo = await db.from('periodos').where('esta_activo', true).first()
      }

      if (!periodo) {
        return response.status(200).json({
          success: true,
          data: [],
          meta: {
            periodo: null,
            total: 0,
            pendientes: 0,
            entregadas: 0,
            calificadas: 0,
          },
        })
      }

      // Obtener asignaciones del curso
      const asignaciones = await Asignacion.query()
        .where('periodo_id', periodo.id)
        .where((query) => {
          query.where('curso_id', estudiante.cursoId).orWhereHas('cursos', (q) => {
            q.where('cursos.id', estudiante.cursoId)
          })
        })
        .preload('categoria')
        .orderBy('fecha_vencimiento', 'asc')

      // Si no hay asignaciones, devolver respuesta vacía evitando whereIn([])
      if (asignaciones.length === 0) {
        return response.status(200).json({
          success: true,
          data: [],
          meta: {
            periodo: { id: periodo.id, nombre: periodo.nombre },
            total: 0,
            pendientes: 0,
            entregadas: 0,
            calificadas: 0,
            ultimaSincronizacion: DateTime.now().toISO(),
          },
        })
      }

      // Obtener entregas y calificaciones del estudiante
      const entregas = await Entrega.query()
        .where('estudiante_id', estudianteIdResolved)
        .whereIn(
          'asignacion_id',
          asignaciones.map((a) => a.id)
        )

      const calificaciones = await Calificacion.query()
        .where('estudiante_id', estudianteIdResolved)
        .whereIn(
          'asignacion_id',
          asignaciones.map((a) => a.id)
        )

      const entregasMap = new Map(entregas.map((e) => [e.asignacionId, e]))
      const calificacionesMap = new Map(calificaciones.map((c) => [c.asignacionId, c]))

      const now = DateTime.now()
      let pendientes = 0
      let entregadas = 0
      let calificadasCount = 0

      const data = asignaciones.map((asig) => {
        const entrega = entregasMap.get(asig.id)
        const calificacion = calificacionesMap.get(asig.id)

        // Calcular estado
        let estado: string
        if (calificacion) {
          estado = 'calificada'
          calificadasCount++
        } else if (entrega) {
          estado = 'entregada'
          entregadas++
        } else if (asig.fechaVencimiento && DateTime.fromJSDate(new Date(asig.fechaVencimiento.toString())) < now) {
          estado = 'vencida'
        } else {
          estado = 'pendiente'
          pendientes++
        }

        // Calcular días restantes
        const fechaVenc = asig.fechaVencimiento
          ? DateTime.fromJSDate(new Date(asig.fechaVencimiento.toString()))
          : null
        const diasRestantes = fechaVenc ? Math.ceil(fechaVenc.diff(now, 'days').days) : null

        return {
          id: asig.id,
          asignacionId: asig.id,
          titulo: asig.titulo,
          descripcionCorta: asig.descripcion?.substring(0, 100) + '...',
          categoria: asig.categoria?.nombre || 'General',
          fechaPublicacion: asig.fechaInicio?.toISODate(),
          fechaVencimiento: asig.fechaVencimiento?.toISODate(),
          diasRestantes,
          frecuencia: asig.frecuencia || 'Única',
          estado,
          tipoCalificacion: 'manual', // Por defecto
          esUrgente: diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 3,
        }
      })

      return response.status(200).json({
        success: true,
        data,
        meta: {
          periodo: { id: periodo.id, nombre: periodo.nombre },
          total: asignaciones.length,
          pendientes,
          entregadas,
          calificadas: calificadasCount,
          ultimaSincronizacion: DateTime.now().toISO(),
        },
      })
    } catch (error) {
      console.error('Error al obtener tareas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-30: Detalle completo de una tarea/asignación
   * GET /asignaciones/:id/detalle
   */
  async detalleAsignacion(ctx: HttpContext) {
    try {
      const { params, response } = ctx
      const jwtUser = (ctx as any).jwtUser || (ctx as any).authUser || (ctx as any).user
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const asignacionId = params.id

      // Obtener asignación con relaciones
      const asignacion = await Asignacion.query()
        .where('id', asignacionId)
        .preload('categoria')
        .preload('bancoTarea')
        .preload('curso')
        .first()

      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'Asignación no encontrada',
        })
      }

      // Verificar que el acudiente tiene acceso (algún hijo en el curso)
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
        })
      }

      // Verificar que algún estudiante está en el curso de la asignación
      const estudianteEnCurso = acudiente.estudiantes.find(
        (e) => e.cursoId === asignacion.cursoId
      )

      if (!estudianteEnCurso) {
        // Verificar en tabla pivote
        const cursoIds = await db
          .from('asignacion_cursos')
          .where('asignacion_id', asignacionId)
          .select('curso_id')

        const cursosAsignacion = cursoIds.map((c: any) => c.curso_id)
        const tieneAcceso = acudiente.estudiantes.some((e) =>
          cursosAsignacion.includes(e.cursoId)
        )

        if (!tieneAcceso) {
          return response.status(403).json({
            success: false,
            message: 'No tienes acceso a esta asignación',
          })
        }
      }

      // Obtener entrega del estudiante (si existe)
      const estudianteId = estudianteEnCurso?.id || acudiente.estudiantes[0]?.id
      let entrega = null
      let calificacion = null

      if (estudianteId) {
        const entregaDb = await Entrega.query()
          .where('asignacion_id', asignacionId)
          .where('estudiante_id', estudianteId)
          .first()

        if (entregaDb) {
          const calificacionDb = await Calificacion.query()
            .where('entrega_id', entregaDb.id)
            .preload('docente', (q) => q.preload('usuario'))
            .first()

          const now = DateTime.now()
          const fechaVenc = asignacion.fechaVencimiento
            ? DateTime.fromJSDate(new Date(asignacion.fechaVencimiento.toString()))
            : null
          const estaVencida = fechaVenc ? fechaVenc < now : false

          // Parseo seguro de archivosUrl
          const archivosParsed = (() => {
            const raw: any = (entregaDb as any).archivosUrl
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

          entrega = {
            id: entregaDb.id,
            descripcion: entregaDb.evidenciaTexto,
            fechaEntrega: entregaDb.fechaEntrega?.toISO(),
            archivos: archivosParsed,
            puedeEditar: !calificacionDb && !estaVencida,
          }

          if (calificacionDb) {
            // Obtener datos del docente de la instancia relacionada
            const docenteRelacionado = calificacionDb.$preloaded.docente as typeof calificacionDb.docente
            calificacion = {
              nota: calificacionDb.nota,
              escala: calificacionDb.escala,
              notaCualitativa: calificacionDb.notaCualitativa,
              retroalimentacion: calificacionDb.retroalimentacion,
              calificadoPor: docenteRelacionado
                ? `${(docenteRelacionado as any).nombres || ''} ${(docenteRelacionado as any).apellidos || ''}`.trim()
                : 'Docente',
              fechaCalificacion: calificacionDb.calificadoEn?.toISO(),
            }
          }
        }
      }

      // Calcular estado y días restantes
      const now = DateTime.now()
      const fechaVenc = asignacion.fechaVencimiento
        ? DateTime.fromJSDate(new Date(asignacion.fechaVencimiento.toString()))
        : null
      const diasRestantes = fechaVenc ? Math.ceil(fechaVenc.diff(now, 'days').days) : null

      let estado = 'pendiente'
      if (calificacion) estado = 'calificada'
      else if (entrega) estado = 'entregada'
      else if (fechaVenc && fechaVenc < now) estado = 'vencida'

      return response.status(200).json({
        success: true,
        data: {
          id: asignacion.id,
          tarea: {
            id: asignacion.bancoTareaId || asignacion.id,
            titulo: asignacion.titulo,
            descripcion: asignacion.descripcion,
            categoria: asignacion.categoria?.nombre || 'General',
            tipoCalificacion: 'manual',
            archivosAdjuntos: [], // TODO: implementar archivos adjuntos
            enlaces: [], // TODO: implementar enlaces
          },
          fechaPublicacion: asignacion.fechaInicio?.toISODate(),
          fechaVencimiento: asignacion.fechaVencimiento?.toISODate(),
          diasRestantes,
          frecuencia: asignacion.frecuencia || 'Única',
          estado,
          entrega,
          calificacion,
        },
      })
    } catch (error) {
      console.error('Error al obtener detalle:', error)
      return ctx.response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

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
      const descripcion = request.input('descripcion') || request.input('evidenciaTexto') || request.input('evidencia_texto')
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
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

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
          
          // Permitir entrega pero marcar como tardía (opcional: puedes bloquearla)
          // Por ahora solo advertimos pero permitimos
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
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp4', 'mov', 'mkv', 'avi',
        'mp3', 'wav', 'm4a',
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
                try { return JSON.parse(s) } catch { return [] }
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
      if (asignacion.fechaVencimiento && DateTime.now() > asignacion.fechaVencimiento) {
        estadoEntrega = 'entregada_tardia'
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
                try { return JSON.parse(s) } catch { return [] }
              }
              return []
            }
            return []
          })(),
          estado: estadoEntrega,
          nombreEnvio: entrega.nombreEnvio,
        },
      })
    } catch (error) {
      console.error('Error al enviar entrega:', error)
      return response.status(500).json({
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

      const entrega = await Entrega.query()
        .where('id', entregaId)
        .preload('asignacion')
        .first()

      if (!entrega) {
        return response.status(404).json({
          success: false,
          message: 'Entrega no encontrada',
        })
      }

      // Verificar que pertenece a un estudiante del acudiente
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

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
      const calificacion = await Calificacion.query()
        .where('entrega_id', entregaId)
        .first()

      if (calificacion) {
        return response.status(403).json({
          success: false,
          message: 'No puedes editar una entrega calificada',
        })
      }

      // Verificar que no esté vencida
      if (entrega.asignacion?.fechaVencimiento) {
        const fechaVenc = DateTime.fromJSDate(
          new Date(entrega.asignacion.fechaVencimiento.toString())
        )
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
            try { return JSON.parse(s) } catch { return [] }
          }
          return []
        }
        return []
      })()

      // Eliminar archivos marcados
      if (archivosEliminar.length > 0) {
        archivosActuales = archivosActuales.filter(
          (_: any, index: number) => !archivosEliminar.includes(index)
        )
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
        message: 'Entrega actualizada correctamente',
        data: {
          id: entrega.id,
          descripcion: entrega.evidenciaTexto,
          fechaEntrega: entrega.fechaEntrega?.toISO(),
          fechaModificacion: entrega.actualizadoEn?.toISO(),
          archivos: archivosActuales,
        },
      })
    } catch (error) {
      console.error('Error al editar entrega:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  // ============================================================
  // EP-09: CALIFICACIONES Y RETROALIMENTACIÓN
  // ============================================================

  /**
   * HU-36: Historial de entregas por período
   * GET /estudiantes/:id/historial
   */
  async historialEstudiante({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const estudianteId = params.id
      const periodoId = request.input('periodo')

      // Verificar vinculación
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({ success: false, message: 'Acudiente no encontrado' })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      // Obtener período
      let periodo
      if (periodoId) {
        periodo = await db.from('periodos').where('id', periodoId).first()
      } else {
        periodo = await db.from('periodos').where('esta_activo', true).first()
      }

      if (!periodo) {
        return response.status(400).json({
          success: false,
          message: 'Período no encontrado',
        })
      }

      // Obtener entregas del período
      const entregas = await Entrega.query()
        .where('estudiante_id', estudianteId)
        .whereHas('asignacion', (q) => {
          q.where('periodo_id', periodo.id)
        })
        .preload('asignacion', (q) => {
          q.preload('categoria')
        })
        .preload('calificacion')
        .orderBy('fecha_entrega', 'desc')

      const data = entregas.map((e) => ({
        id: e.id,
        tarea: {
          id: e.asignacion?.id,
          titulo: e.asignacion?.titulo,
          categoria: e.asignacion?.categoria?.nombre || 'General',
        },
        fechaEntrega: e.fechaEntrega?.toISO(),
        estado: e.calificacion ? 'calificada' : 'entregada',
        miniatura: e.archivosUrl ? JSON.parse(e.archivosUrl)[0] : null,
        calificacion: e.calificacion
          ? {
              nota: e.calificacion.nota,
              escala: e.calificacion.escala,
            }
          : null,
      }))

      // Calcular estadísticas
      const estudiante = await Estudiante.find(estudianteId)
      const totalAsignaciones = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where((q) => {
          if (estudiante?.cursoId) {
            q.where('curso_id', estudiante.cursoId)
          }
        })
        .count('* as total')

      const totalTareas = Number(totalAsignaciones[0]?.total || 0)
      const tareasCompletadas = entregas.length
      const porcentajeCumplimiento =
        totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0

      const calificaciones = entregas.filter((e) => e.calificacion?.nota)
      const promedio =
        calificaciones.length > 0
          ? parseFloat(
              (
                calificaciones.reduce((sum, e) => sum + (e.calificacion?.nota || 0), 0) /
                calificaciones.length
              ).toFixed(1)
            )
          : 0

      let escala = 'Sin datos'
      if (promedio >= 4.6) escala = 'Superior'
      else if (promedio >= 4.0) escala = 'Alto'
      else if (promedio >= 3.0) escala = 'Básico'
      else if (promedio > 0) escala = 'Bajo'

      return response.status(200).json({
        success: true,
        data: {
          periodo: {
            id: periodo.id,
            nombre: periodo.nombre,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin,
          },
          entregas: data,
          estadisticas: {
            totalTareas,
            tareasCompletadas,
            porcentajeCumplimiento,
            promedio,
            escala,
          },
        },
      })
    } catch (error) {
      console.error('Error al obtener historial:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-37: Estadísticas de desempeño
   * GET /estudiantes/:id/estadisticas
   */
  async estadisticasEstudiante({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const estudianteId = params.id
      const periodoId = request.input('periodo')

      // Verificar vinculación
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({ success: false, message: 'Acudiente no encontrado' })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      const estudiante = await Estudiante.find(estudianteId)
      if (!estudiante) {
        return response.status(404).json({ success: false, message: 'Estudiante no encontrado' })
      }

      // Obtener período
      let periodo
      if (periodoId) {
        periodo = await db.from('periodos').where('id', periodoId).first()
      } else {
        periodo = await db.from('periodos').where('esta_activo', true).first()
      }

      if (!periodo) {
        return response.status(200).json({
          success: true,
          data: {
            periodo: null,
            totalTareas: 0,
            tareasCompletadas: 0,
            tareasPendientes: 0,
            tareasVencidas: 0,
            porcentajeCumplimiento: 0,
            promedio: 0,
            escala: 'Sin datos',
            distribucionNotas: { alto: 0, medio: 0, bajo: 0 },
          },
        })
      }

      // Total de tareas del período para el curso
      const totalAsignaciones = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where((q) => {
          q.where('curso_id', estudiante.cursoId)
        })
        .count('* as total')

      const totalTareas = Number(totalAsignaciones[0]?.total || 0)

      // Entregas del estudiante
      const entregas = await Entrega.query()
        .where('estudiante_id', estudianteId)
        .whereHas('asignacion', (q) => {
          q.where('periodo_id', periodo.id)
        })
        .preload('calificacion')

      const tareasCompletadas = entregas.length

      // Tareas vencidas sin entregar
      const now = DateTime.now()
      const asignacionesVencidas = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where('curso_id', estudiante.cursoId)
        .where('fecha_vencimiento', '<', now.toSQL())
        .whereNotIn(
          'id',
          entregas.map((e) => e.asignacionId)
        )
        .count('* as total')

      const tareasVencidas = Number(asignacionesVencidas[0]?.total || 0)
      const tareasPendientes = totalTareas - tareasCompletadas - tareasVencidas

      const porcentajeCumplimiento =
        totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0

      // Calificaciones
      const calificaciones = await Calificacion.query()
        .where('estudiante_id', estudianteId)
        .where('periodo_id', periodo.id)
        .whereNotNull('nota')

      const notas = calificaciones.map((c) => c.nota || 0)
      const promedio =
        notas.length > 0
          ? parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1))
          : 0

      let escala = 'Sin datos'
      if (promedio >= 4.6) escala = 'Superior'
      else if (promedio >= 4.0) escala = 'Alto'
      else if (promedio >= 3.0) escala = 'Básico'
      else if (promedio > 0) escala = 'Bajo'

      // Distribución de notas
      const distribucionNotas = {
        alto: notas.filter((n) => n >= 4.0).length,
        medio: notas.filter((n) => n >= 3.0 && n < 4.0).length,
        bajo: notas.filter((n) => n < 3.0).length,
      }

      return response.status(200).json({
        success: true,
        data: {
          periodo: { id: periodo.id, nombre: periodo.nombre },
          totalTareas,
          tareasCompletadas,
          tareasPendientes: Math.max(0, tareasPendientes),
          tareasVencidas,
          porcentajeCumplimiento,
          promedio,
          escala,
          distribucionNotas,
        },
      })
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  // ============================================================
  // EP-10: NOTIFICACIONES
  // EP-10: NOTIFICACIONES PUSH (IMPLEMENTACIÓN COMPLETA)
  // ============================================================

  /**
   * HU-38: Registrar token FCM para push notifications
   * POST /api/movil/notificaciones/token
   * Input: { fcmToken, dispositivo?, sistemaOperativo?, versionApp? }
   */
  async registrarTokenFCM({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }
      
      const payload = request.only([
        'fcmToken',
        'dispositivo', 
        'sistemaOperativo',
        'versionApp'
      ])

      // Validación
      await validator.validate({
        schema: schema.create({
          fcmToken: validator.string([rules.required(), rules.maxLength(255)]),
          dispositivo: validator.string([rules.maxLength(100)]).optional(),
          sistemaOperativo: validator.string([rules.maxLength(50)]).optional(),
          versionApp: validator.string([rules.maxLength(50)]).optional()
        }),
        data: payload,
      })

      // Verificar si ya existe el token para este usuario
      const tokenExistente = await db.from('dispositivos_moviles')
        .where('usuario_id', jwtUser.id)
        .where('token_fcm', payload.fcmToken)
        .first()

      if (tokenExistente) {
        // Actualizar token existente
        await db.from('dispositivos_moviles')
          .where('id', tokenExistente.id)
          .update({
            dispositivo: payload.dispositivo || tokenExistente.dispositivo,
            sistema_operativo: payload.sistemaOperativo || tokenExistente.sistema_operativo,
            version_app: payload.versionApp || tokenExistente.version_app,
            activo: true,
            actualizado_en: DateTime.now().toSQL()
          })

        return response.json({
          success: true,
          message: 'Token actualizado exitosamente',
          data: { tokenRegistrado: true }
        })
      }

      // Actualizar usuario con token FCM
      const usuario = await Usuario.find(jwtUser.id)
      if (usuario) {
        usuario.tokenFcm = payload.fcmToken
        await usuario.save()
      }

      // Desactivar tokens anteriores del mismo usuario
      await db.from('dispositivos_moviles')
        .where('usuario_id', jwtUser.id)
        .update({ activo: false })

      // Insertar nuevo token
      await db.table('dispositivos_moviles').insert({
        usuario_id: jwtUser.id,
        token_fcm: payload.fcmToken,
        dispositivo: payload.dispositivo || 'Desconocido',
        sistema_operativo: payload.sistemaOperativo || 'Desconocido',
        version_app: payload.versionApp,
        activo: true,
        creado_en: DateTime.now().toSQL(),
        actualizado_en: DateTime.now().toSQL()
      })

      console.log(`[FCM] Token registrado para usuario ${jwtUser.id}`)

      return response.status(201).json({
        success: true,
        message: 'Token FCM registrado exitosamente',
        data: { tokenRegistrado: true }
      })
    } catch (error) {
      console.error('Error al registrar token FCM:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al registrar token FCM',
        error: error.message
      })
    }
  }

  /**
   * HU-38: Listar notificaciones
   * GET /notificaciones
   * HU-38: Listar notificaciones del usuario
   * GET /api/movil/notificaciones
   * Query: ?page=1&limit=20&tipo=tarea&leida=false
   */
  async listarNotificaciones({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      const { page = 1, limit = 20, tipo, leida } = request.qs()
      
      let query = db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .orderBy('creada_en', 'desc')

      // Filtros
      if (tipo) {
        query = query.where('tipo', tipo)
      }
      
      if (leida !== undefined) {
        query = query.where('leida', leida === 'true')
      }

      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      // Paginación
      const offset = (Number(page) - 1) * Number(limit)
      const notificaciones = await query.limit(Number(limit)).offset(offset)
      
      // Contar total
      const totalCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .if(tipo, (q) => q.where('tipo', tipo))
        .if(leida !== undefined, (q) => q.where('leida', leida === 'true'))
        .count('* as total')
        .first()

      const notificaciones = await Notificacion.query()
        .where('destinatario_id', jwtUser.id)
        .orderBy('creado_en', 'desc')
        .paginate(page, limit)

      const noLeidas = await Notificacion.query()
        .where('destinatario_id', jwtUser.id)
        .whereNull('leido_en')
      // Contar no leídas
      const noLeidasCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .count('* as total')
        .first()

      const data = notificaciones.all().map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.asunto || this.getTituloNotificacion(n.tipo),
        mensaje: n.mensaje,
        datos: n.metadatos,
        leida: n.leidoEn !== null,
        leidaEn: n.leidoEn?.toISO(),
        creadaEn: n.creadoEn?.toISO(),
      }))

      return response.status(200).json({
      return response.json({
        success: true,
        data,
        data: notificaciones,
        meta: {
          total: notificaciones.total,
          noLeidas: Number(noLeidas[0]?.$extras?.total || 0),
          page: notificaciones.currentPage,
          limit: notificaciones.perPage,
        },
          total: Number(totalCount?.total || 0),
          noLeidas: Number(noLeidasCount?.total || 0),
          page: Number(page),
          limit: Number(limit),
          tipos: ['tarea', 'evento', 'recordatorio', 'general', 'urgente']
        }
      })
    } catch (error) {
      console.error('Error al listar notificaciones:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al listar notificaciones',
        error: error.message
      })
    }
  }

  private getTituloNotificacion(tipo: string): string {
    const titulos: Record<string, string> = {
      nueva_tarea: '🆕 Nueva tarea asignada',
      calificacion: '📝 Tarea calificada',
      recordatorio: '⏰ Recordatorio',
      vencida: '⚠️ Tarea vencida',
      entrega: '📤 Entrega recibida',
    }
    return titulos[tipo] || 'Notificación'
  }

  /**
   * HU-39: Marcar notificación como leída
   * PUT /notificaciones/:id/leer
   * HU-39: Marcar notificación individual como leída
   * PUT /api/movil/notificaciones/:id/leer
   */
  async marcarLeida({ params, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }
      const notificacionId = params.id

      const notificacion = await Notificacion.query()
        .where('id', params.id)
        .where('destinatario_id', jwtUser.id)
      // Verificar que la notificación exista y pertenezca al usuario
      const notificacion = await db.from('notificaciones_push')
        .where('id', notificacionId)
        .where('usuario_id', jwtUser.id)
        .first()

      if (!notificacion) {
        return response.status(404).json({
          success: false,
          message: 'Notificación no encontrada',
          message: 'Notificación no encontrada'
        })
      }

      notificacion.leidoEn = DateTime.now()
      notificacion.estado = 'leida'
      await notificacion.save()
      if (notificacion.leida) {
        return response.json({
          success: true,
          message: 'Notificación ya estaba marcada como leída',
          data: notificacion
        })
      }

      return response.status(200).json({
      // Marcar como leída
      await db.from('notificaciones_push')
        .where('id', notificacionId)
        .update({
          leida: true,
          leida_en: DateTime.now().toSQL()
        })

      // Obtener notificación actualizada
      const notificacionActualizada = await db.from('notificaciones_push')
        .where('id', notificacionId)
        .first()

      return response.json({
        success: true,
        message: 'Notificación marcada como leída',
        data: notificacionActualizada
      })
    } catch (error) {
      console.error('Error al marcar leída:', error)
      console.error('Error al marcar notificación como leída:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al marcar notificación como leída',
        error: error.message
      })
    }
  }

  /**
   * HU-39: Marcar todas como leídas
   * PUT /notificaciones/leer-todas
   * HU-39: Marcar todas las notificaciones como leídas
   * PUT /api/movil/notificaciones/leer-todas
   */
  async marcarTodasLeidas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
      // Contar notificaciones no leídas
      const noLeidasCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .count('* as total')
        .first()

      const cantidad = Number(noLeidasCount?.total || 0)

      if (cantidad === 0) {
        return response.json({
          success: true,
          message: 'No hay notificaciones pendientes por marcar como leídas',
          data: { cantidad: 0 }
        })
      }

      const updated = await db
        .from('notificaciones')
        .where('destinatario_id', jwtUser.id)
        .whereNull('leido_en')
      // Marcar todas como leídas
      await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .update({
          leido_en: DateTime.now().toSQL(),
          estado: 'leida',
          leida: true,
          leida_en: DateTime.now().toSQL()
        })

      return response.status(200).json({
      return response.json({
        success: true,
        message: `${updated} notificaciones marcadas como leídas`,
        message: `${cantidad} notificaciones marcadas como leídas`,
        data: { cantidad }
      })
    } catch (error) {
      console.error('Error al marcar todas leídas:', error)
      console.error('Error al marcar todas las notificaciones como leídas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al marcar notificaciones como leídas',
        error: error.message
      })
    }
  }

  /**
   * HU-40: Obtener preferencias de usuario
   * GET /usuarios/preferencias
   * HU-40: Obtener preferencias de notificaciones
   * GET /api/movil/usuarios/preferencias
   */
  async obtenerPreferencias({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      // Obtener preferencias del usuario (usar tabla de configuración si existe)
      const preferencias = {
        notificaciones: {
          nuevasTareas: true,
          calificaciones: true,
          recordatorios: true,
          eventos: true,
          general: true
        },
        dispositivos: await db.from('dispositivos_moviles')
          .where('usuario_id', jwtUser.id)
          .where('activo', true)
          .select('dispositivo', 'sistema_operativo', 'version_app', 'actualizado_en')
      }

      // Por ahora retornamos valores por defecto
      // TODO: Crear tabla preferencias_usuario si se requiere persistencia
      return response.status(200).json({
      return response.json({
        success: true,
        data: {
          notificaciones: {
            nuevasTareas: true,
            calificaciones: true,
            recordatorios: true,
          },
        },
        data: preferencias
      })
    } catch (error) {
      console.error('Error al obtener preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al obtener preferencias',
        error: error.message
      })
    }
  }

  /**
   * HU-40: Actualizar preferencias de usuario
   * PUT /usuarios/preferencias
   * HU-40: Actualizar preferencias de notificaciones
   * PUT /api/movil/usuarios/preferencias
   * Input: { notificaciones: { nuevasTareas, calificaciones, recordatorios } }
   */
  async actualizarPreferencias({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
      const preferencias = request.input('notificaciones')

      // Validación básica
      if (!preferencias || typeof preferencias !== 'object') {
        return response.status(400).json({
          success: false,
          message: 'No autenticado',
          message: 'Se requiere el objeto de preferencias'
        })
      }

      const preferencias = request.input('notificaciones')
      // Aquí se guardarían las preferencias en una tabla de configuración
      // Por ahora, solo simulamos la actualización
      console.log(`Preferencias actualizadas para usuario ${jwtUser.id}:`, preferencias)

      // TODO: Guardar en BD cuando se implemente tabla preferencias_usuario
      console.log(`[Preferencias] Usuario ${jwtUser.id}:`, preferencias)

      return response.status(200).json({
      return response.json({
        success: true,
        message: 'Preferencias actualizadas',
        message: 'Preferencias actualizadas exitosamente',
        data: preferencias
      })
    } catch (error) {
      console.error('Error al actualizar preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error al actualizar preferencias',
        error: error.message
      })
    }
  }

  /**
   * HU-42: Información de soporte
   * GET /soporte/info
   * HU-42: Información de contacto de soporte
   * GET /api/movil/soporte/info
   */
  async infoSoporte({ response }: HttpContext) {
    return response.status(200).json({
      success: true,
      data: {
        email: 'parchandojuntos2025@gmail.com',
        whatsapp: '+573107392818',
        horarioAtencion: 'Lunes a Viernes 8:00 - 17:00',
      },
    })
    try {
      const infoSoporte = {
        telefono: '+57 1 2345678',
        email: 'soporte@escuelapadres.com',
        whatsapp: '+57 300 1234567',
        horario: 'Lunes a Viernes 8:00 AM - 6:00 PM',
        web: 'https://escuelapadres.com/soporte'
      }

      return response.json({
        success: true,
        data: infoSoporte
      })
    } catch (error) {
      console.error('Error al obtener info de soporte:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener información de soporte'
      })
    }
  }

  // ============================================================
  // MODO OFFLINE (EP-08)
  // UTILIDADES PARA NOTIFICACIONES PUSH
  // ============================================================

  static async enviarNotificacionPush(
    usuarioId: number,
    titulo: string,
    cuerpo: string,
    tipo: string = 'general',
    datos: any = {}
  ) {
    try {
      // Obtener tokens FCM activos del usuario
      const dispositivos = await db.from('dispositivos_moviles')
        .where('usuario_id', usuarioId)
        .where('activo', true)
        .select('token_fcm')

      if (dispositivos.length === 0) {
        console.log(`No hay dispositivos activos para el usuario ${usuarioId}`)
        return
      }

      // Guardar notificación en BD
      const notificacionId = await db.table('notificaciones_push').insertGetId({
      const [notificacionId] = await db.table('notificaciones_push').insert({
        usuario_id: usuarioId,
        titulo,
        cuerpo,
        tipo,
        datos: JSON.stringify(datos),
        leida: false,
        creada_en: DateTime.now().toSQL()
      })
      }).returning('id')

      // Enviar notificación via Firebase
      const messaging = getMessaging()
      if (messaging) {
        const tokens = dispositivos.map(d => d.token_fcm)
        
        const message = {
          notification: {
            title: titulo,
            body: cuerpo
          },
          data: {
            ...datos,
            tipo,
            notificacionId: notificacionId.toString()
          },
          tokens: tokens
        }

        try {
          const result = await messaging.sendMulticast(message)
          const result = await (messaging as any).sendMulticast(message)
          console.log(`Notificación enviada: ${result.successCount}/${tokens.length} exitosos`)
        } catch (error) {
          console.error('Error al enviar notificación push:', error)
        }
      } else {
        console.warn('Firebase Messaging no disponible')
      }
    } catch (error) {
      console.error('Error en enviarNotificacionPush:', error)
    }
  }

  /**
   * HU-32: Sincronizar entrega creada offline
   * POST /asignaciones/:id/entregas/sync
   * TEMPORAL: Arreglar problema de login acudiente
   * POST /api/movil/debug/arreglar-acudiente
   */
  async sincronizarEntrega({ params, request, response, jwtUser }: HttpContext) {
  async arreglarAcudiente({ response }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
      console.log('🔧 ARREGLANDO PROBLEMA DE LOGIN ACUDIENTE')
      
      // 1. Verificar roles disponibles
      const roles = await db.from('roles').select('*')
      console.log('Roles disponibles:', roles)
      
      // 2. Buscar usuario acudiente
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'No autenticado',
          message: 'Usuario acudiente.test@gmail.com no encontrado'
        })
      }
      
      console.log('Usuario actual:', usuario)
      
      // 3. Buscar rol de acudiente
      let rolAcudiente = await db.from('roles').where('nombre', 'like', '%acudiente%').first()
      
      if (!rolAcudiente) {
        // Crear rol de acudiente
        const nuevoRolId = await db.table('roles').insertGetId({
          nombre: 'Acudiente',
          descripcion: 'Rol para padres de familia',
          creado_en: DateTime.now().toSQL()
        })
        
        rolAcudiente = { id: nuevoRolId, nombre: 'Acudiente' }
        console.log('Rol de acudiente creado:', nuevoRolId)
      }
      
      // 4. Actualizar usuario al rol correcto
      await db.from('usuarios').where('id', usuario.id).update({
        rol_id: rolAcudiente.id,
        esta_activo: true
      })
      
      // 5. Resetear contraseña
      const nuevaContrasena = 'Acudiente123!'
      const hashedPassword = await hash.make(nuevaContrasena)
      
      await db.from('usuarios').where('id', usuario.id).update({
        contrasena_hash: hashedPassword
      })
      
      // 6. Verificar acudiente
      const acudiente = await db.from('acudientes').where('usuario_id', usuario.id).first()
      
      const resultado = {
        success: true,
        message: 'Acudiente arreglado exitosamente',
        datos: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rol_id: rolAcudiente.id,
            rol_nombre: rolAcudiente.nombre,
            activo: true
          },
          acudiente: {
            id: acudiente.id,
            nombre: `${acudiente.nombres} ${acudiente.apellidos}`,
            documento: acudiente.numero_documento
          },
          login: {
            documento: acudiente.numero_documento,
            contraseña: nuevaContrasena
          }
        }
      }
      
      console.log('✅ Acudiente arreglado:', resultado)
      return response.json(resultado)
      
    } catch (error) {
      console.error('❌ Error arreglando acudiente:', error)
      return response.status(500).json({
        success: false,
        message: 'Error arreglando acudiente',
        error: error.message
      })
    }
  }

      const asignacionId = params.id
      const estudianteId = request.input('estudianteId') || request.input('estudiante_id')
      const descripcion = request.input('descripcion') || request.input('evidenciaTexto')
      const archivos = request.input('archivos') || request.input('archivosUrl')
      const timestampLocal = request.input('timestampLocal')
  /**
   * TEMPORAL: Simular notificación de tarea asignada
   * POST /api/movil/debug/notificar-tarea-asignada
   */
  async notificarTareaAsignada({ response }: HttpContext) {
  async notificarTareaAsignada({ request, response }: HttpContext) {
    try {
      console.log('📚 SIMULANDO NOTIFICACIÓN DE TAREA ASIGNADA')
      
      // Buscar usuario acudiente
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      const { token } = request.only(['token'])

      if (!estudianteId) {
      if (!token) {
        return response.status(400).json({
          success: false,
          errors: ['El estudianteId es requerido'],
          message: 'El token FCM del dispositivo es requerido para esta prueba.',
        })
      }

      // Verificar vinculación acudiente-estudiante
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()
      console.log('🚀 EJECUTANDO PRUEBA REAL DE NOTIFICACIÓN CON TOKEN:', token.substring(0, 20) + '...')

      if (!acudiente) {
      // 1. Buscar usuario acudiente de prueba
      const usuario = await Usuario.query().where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
          message: 'Usuario acudiente no encontrado'
          message: 'Usuario de prueba acudiente.test@gmail.com no encontrado',
        })
      }
      
      // Simular envío de notificación (sin Firebase real)
      console.log('📱 Notificación simulada enviada a usuario:', usuario.id)
      
      return response.json({
        success: true,
        message: 'Notificación de tarea asignada enviada (simulada)',
        datos: {
          titulo: '📚 Nueva Tarea Asignada',
          mensaje: 'Se ha asignado una nueva tarea: Operaciones matemáticas básicas',
      console.log(`✅ Usuario de prueba encontrado: ID ${usuario.id}`)

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'Este estudiante no está vinculado a tu cuenta',
        })
      // 2. Crear una tarea de prueba en la BD para que sea real
      const acudiente = await Acudiente.query().where('usuario_id', usuario.id).preload('estudiantes').first()
      if (!acudiente || acudiente.estudiantes.length === 0) {
        return response.status(400).json({ success: false, message: 'El usuario de prueba no tiene estudiantes vinculados.' })
      }
      const estudiante = acudiente.estudiantes[0]
      const periodo = await db.from('periodos').where('esta_activo', true).first()
      const periodoId = periodo ? periodo.id : 1
      const tituloTarea = `Tarea de Prueba Real ${DateTime.now().toFormat('HH:mm:ss')}`

      // Verificar asignación
      const asignacion = await Asignacion.find(asignacionId)
      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'Asignación no encontrada',
        })
      const asignacion = await Asignacion.create({
        titulo: tituloTarea,
        descripcion: 'Esta es una tarea real creada desde el backend para probar el flujo completo.',
        cursoId: estudiante.cursoId,
        periodoId: periodoId,
        categoriaId: 1,
        fechaInicio: DateTime.now(),
        fechaVencimiento: DateTime.now().plus({ days: 3 }),
        activa: true,
        docenteId: 1,
        institucionId: 1,
      })
      console.log(`✅ Tarea de prueba creada en la BD: ID ${asignacion.id}`)

      // 3. Preparar y enviar la notificación PUSH real
      const titulo = '📚 Nueva Tarea Asignada'
      const cuerpo = `Se ha asignado una nueva tarea: ${tituloTarea}`
      const tipo = 'nueva_tarea'
      const datos = {
        asignacionId: asignacion.id.toString(),
        tipo: 'nueva_tarea',
      }

      // Parsear timestamp local (no puede ser futuro)
      let fechaEntrega = DateTime.now()
      if (timestampLocal) {
        const fechaLocal = DateTime.fromISO(timestampLocal)
        if (fechaLocal.isValid && fechaLocal <= DateTime.now()) {
          fechaEntrega = fechaLocal
        }
      const messaging = getMessaging()
      if (!messaging) {
        console.error('❌ Firebase Messaging no está disponible. Verifica la configuración.')
        return response.status(500).json({ success: false, message: 'Firebase Messaging no está configurado en el backend.' })
      }

      // Verificar si ya existe entrega
      let entrega = await Entrega.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()
      const message = {
        notification: { title: titulo, body: cuerpo },
        data: { ...datos, tipo },
        token: token, // Usamos el token específico de la petición
      }

      const archivosJson = archivos ? JSON.stringify(archivos) : null
      console.log('📦 Enviando payload a Firebase:', JSON.stringify(message, null, 2))

      if (entrega) {
        // Actualizar entrega existente (modo offline pudo crear una nueva mientras había otra)
        entrega.evidenciaTexto = descripcion || entrega.evidenciaTexto
        entrega.archivosUrl = archivosJson || entrega.archivosUrl
        // Mantener la fecha más antigua (la del modo offline)
        if (entrega.fechaEntrega && fechaEntrega < entrega.fechaEntrega) {
          entrega.fechaEntrega = fechaEntrega
      try {
        const result = await messaging.send(message)
        console.log('✅ Notificación enviada con éxito a Firebase. Message ID:', result)

        await db.table('notificaciones_push').insert({
          usuario_id: usuario.id,
          tipo: 'tarea',
          titulo,
          cuerpo,
          tipo,
          datos: JSON.stringify(datos),
          leida: false,
          creada_en: DateTime.now().toSQL(),
        })
        console.log('💾 Notificación guardada en la base de datos.')

        return response.json({
          success: true,
          message: '¡Notificación enviada exitosamente!',
          datos: {
            asignacion_id: 123,
            tipo: 'nueva_tarea',
            fecha_vencimiento: DateTime.now().plus({ days: 3 }).toSQLDate(),
            curso: 'Primero A',
            materia: 'Matemáticas'
          }
        }
        await entrega.save()
      } else {
        entrega = await Entrega.create({
          asignacionId: Number(asignacionId),
          estudianteId: Number(estudianteId),
          acudienteId: acudiente.id,
          evidenciaTexto: descripcion,
          archivosUrl: archivosJson,
          fechaEntrega: fechaEntrega,
          estado: 'enviada',
          institucionId: asignacion.institucionId,
          nombreEnvio: `${acudiente.nombres} ${acudiente.apellidos}`,
      })
      
            messageId: result,
            tokenUsado: token.substring(0, 20) + '...',
            usuarioId: usuario.id,
            asignacionId: asignacion.id,
            titulo: tituloTarea,
            nota: 'Deberías haber recibido esta notificación en tu dispositivo. Revisa la app.',
          },
        })
      } catch (firebaseError) {
        console.error('❌ ERROR DE FIREBASE al enviar notificación:', firebaseError)
        return response.status(500).json({
          success: false,
          message: 'Error de Firebase al enviar la notificación.',
          error: { code: firebaseError.code, message: firebaseError.message },
          posibles_causas: [
            'El token FCM no es válido o expiró.',
            'La app móvil no tiene permisos para recibir notificaciones.',
            'El proyecto de Firebase en el backend (service account) no coincide con el de la app móvil (google-services.json).',
          ],
        })
      }
    } catch (error) {
      console.error('❌ Error enviando notificación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error enviando notificación',
        error: error.message
      })
    }
  }

      return response.status(201).json({
  /**
   * TEMPORAL: Simular notificación de tarea próxima a vencer
   * POST /api/movil/debug/notificar-tarea-proxima-vencer
   */
  async notificarTareaProximaVencer({ response }: HttpContext) {
    try { 
      console.log('⏰ SIMULANDO NOTIFICACIÓN DE TAREA PRÓXIMA A VENCER')
      
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario acudiente no encontrado'
        })
      }
      
      // Simular envío de notificación
      console.log('📱 Notificación simulada enviada a usuario:', usuario.id)
      
      return response.json({
        success: true,
        message: 'Entrega sincronizada correctamente',
        data: {
          id: entrega.id,
          fechaEntrega: entrega.fechaEntrega?.toISO(),
          sincronizado: true,
        },
        message: 'Notificación de tarea próxima a vencer enviada',
        datos: {
          titulo: '⏰ Tarea por Vencer',
          mensaje: 'La tarea "Investigación ciencias naturales" vence mañana',
          usuario_id: usuario.id,
          urgencia: 'alta'
        }
      })
      
    } catch (error) {
      console.error('Error al sincronizar entrega:', error)
      console.error('❌ Error enviando notificación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error enviando notificación',
        error: error.message
      })
    }
  }

  /**
   * HU-34: Obtener datos para caché offline
   * GET /estudiantes/:id/tareas/sync
   * TEMPORAL: Simular notificación de tarea calificada
   * POST /api/movil/debug/notificar-tarea-calificada
   */
  async sincronizarTareas({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
  async notificarTareaCalificada({ response }: HttpContext) {
    try { 
      console.log('✅ SIMULANDO NOTIFICACIÓN DE TAREA CALIFICADA')
      
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'No autenticado',
          message: 'Usuario acudiente no encontrado'
        })
      }
      
      // Simular envío de notificación
      console.log('📱 Notificación simulada enviada a usuario:', usuario.id)
      
      return response.json({
        success: true,
        message: 'Notificación de tarea calificada enviada (simulada)',
        datos: {
          titulo: '✅ Tarea Calificada',
          mensaje: 'María Pérez recibió 4.8 en "Geometría básica"',
          usuario_id: usuario.id,
          nota: 4.8,
          estudiante: 'María Pérez',
          tipo: 'tarea',
          datos: {
            asignacion_id: 789,
            estudiante_id: 101,
            tipo: 'calificada',
            nota: 4.8,
            escala: 'Superior',
            estudiante_nombre: 'María Pérez',
            materia: 'Matemáticas'
          }
        }
      })
      
    } catch (error) {
      console.error('❌ Error enviando notificación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error enviando notificación',
        error: error.message
      })
    }
  }

      const estudianteId = params.id
      const ultimaSync = request.input('ultimaSync')
  /**
   * TEMPORAL: Simular notificación de tarea vencida
   * POST /api/movil/debug/notificar-tarea-vencida
   */
  async notificarTareaVencida({ response }: HttpContext) {
    try { 
      console.log('❌ SIMULANDO NOTIFICACIÓN DE TAREA VENCIDA')
      
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario acudiente no encontrado'
        })
      }
      
      // Simular envío de notificación
      console.log('📱 Notificación simulada enviada a usuario:', usuario.id)
      
      return response.json({
        success: true,
        message: 'Notificación de tarea vencida enviada',
        datos: {
          titulo: '❌ Tarea Vencida',
          mensaje: 'La tarea "Mapa geográfico de Colombia" ha vencido sin ser entregada',
          usuario_id: usuario.id,
          urgencia: 'urgente'
        }
      })
      
    } catch (error) {
      console.error('❌ Error enviando notificación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error enviando notificación',
        error: error.message
      })
    }
  }

      // Verificar vinculación
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
  /**
   * TEMPORAL: Verificar dispositivo FCM registrado
   * GET /api/movil/debug/verificar-dispositivo
   */
  async verificarDispositivo({ response }: HttpContext) {
    try { 
      console.log('📱 VERIFICANDO DISPOSITIVO FCM REGISTRADO')
      
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Acudiente no encontrado',
          message: 'Usuario acudiente no encontrado'
        })
      }
      
      const dispositivos = await db.from('dispositivos_moviles')
        .where('usuario_id', usuario.id)
        .where('activo', true)
        .select('*')
      
      return response.json({
        success: true,
        message: 'Dispositivos FCM verificados',
        datos: {
          usuario_id: usuario.id,
          total_dispositivos: dispositivos.length,
          dispositivos: dispositivos.map(d => ({
            id: d.id,
            token_fcm: d.token_fcm.substring(0, 20) + '...',
            dispositivo: d.dispositivo,
            sistema_operativo: d.sistema_operativo,
            version_app: d.version_app,
            activo: d.activo,
            creado_en: d.creado_en
          }))
        }
      })
      
    } catch (error) {
      console.error('❌ Error verificando dispositivos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error verificando dispositivos',
        error: error.message
      })
    }
  }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
  /**
   * TEMPORAL: Verificar Firebase y enviar notificación real
   * POST /api/movil/debug/verificar-firebase
   */
  async verificarFirebase({ response }: HttpContext) {
    try { 
      console.log('🔥 VERIFICANDO CONFIGURACIÓN FIREBASE')
      
      // Inicializar Firebase directamente
      let messaging = null
      try {
        const serviceAccountKey = env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        if (serviceAccountKey) {
          const serviceAccount = JSON.parse(serviceAccountKey)
          const admin = require('firebase-admin')
          const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          })
          messaging = admin.messaging()
          console.log('✅ Firebase inicializado correctamente')
        }
      } catch (error) {
        console.log('❌ Error inicializando Firebase:', error.message)
      }
      
      if (!messaging) {
        return response.json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
          message: 'Firebase Messaging no está configurado',
          datos: {
            firebase_disponible: false,
            error: 'No se pudo inicializar Firebase Admin SDK',
            solucion: 'Verifica las credenciales de FIREBASE_SERVICE_ACCOUNT_KEY'
          }
        })
      }

      const estudiante = await Estudiante.find(estudianteId)
      if (!estudiante) {
      
      // Buscar usuario
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Estudiante no encontrado',
          message: 'Usuario acudiente no encontrado'
        })
      }

      // Obtener período activo
      const periodo = await db.from('periodos').where('esta_activo', true).first()
      if (!periodo) {
        return response.status(200).json({
      
      // Enviar notificación de prueba real
      const message = {
        notification: {
          title: '🔥 Notificación de Prueba Firebase',
          body: 'Esta es una notificación real desde Firebase'
        },
        data: {
          tipo: 'prueba_firebase',
          usuario_id: usuario.id.toString(),
          timestamp: new Date().toISOString()
        },
        token: 'test_fcm_token_android_demo_123456' // Token de prueba
      }
      
      try {
        const result = await messaging.send(message)
        console.log('✅ Notificación Firebase enviada:', result)
        
        return response.json({
          success: true,
          data: {
            tareasActualizadas: [],
            tareasEliminadas: [],
            entregasActualizadas: [],
            calificacionesNuevas: [],
            timestamp: DateTime.now().toISO(),
          },
          message: 'Firebase configurado y notificación enviada',
          datos: {
            firebase_disponible: true,
            message_id: result,
            token_usado: message.token,
            nota: 'Esta notificación solo funcionará con un token FCM real'
          }
        })
      } catch (firebaseError: any) {
        console.log('⚠️ Error Firebase (esperado con token de prueba):', firebaseError.message)
        
        return response.json({
          success: true,
          message: 'Firebase configurado pero necesita token FCM real',
          datos: {
            firebase_disponible: true,
            error_firebase: firebaseError.message,
            proyecto_firebase: 'catedra-6146e (actual) -> catedra-familia-movil (necesario)',
            solucion: 'Registra un token FCM real desde la app Android',
            pasos_android: [
              '1. Tu app ya tiene google-services.json de catedra-familia-movil ✅',
              '2. Obtén el token FCM: FirebaseMessaging.getInstance().token',
              '3. Registra el token en: POST /api/movil/notificaciones/token',
              '4. Prueba las notificaciones reales'
            ],
            pasos_backend: [
              '1. Descarga service account key de catedra-familia-movil',
              '2. Actualiza FIREBASE_SERVICE_ACCOUNT_KEY en .env',
              '3. Reinicia el servidor'
            ]
          }
        })
      }
      
    } catch (error) {
      console.error('❌ Error verificando Firebase:', error)
      return response.status(500).json({
        success: false,
        message: 'Error verificando Firebase',
        error: error.message
      })
    }
  }

      // Filtrar por última sincronización si se proporciona
      let fechaFiltro: DateTime | null = null
      if (ultimaSync) {
        fechaFiltro = DateTime.fromISO(ultimaSync)
  /**
   * TEMPORAL: Depurar configuración Firebase
   * GET /api/movil/debug/firebase-config
   */
  async depurarFirebaseConfig({ response }: HttpContext) {
    try { 
      console.log('🔍 DEPURANDO CONFIGURACIÓN FIREBASE')
      
      const serviceAccountKey = env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
      const serviceAccountPath = env.get('FIREBASE_SERVICE_ACCOUNT_PATH')
      
      let parsedKey = null
      let parseError = null
      
      if (serviceAccountKey) {
        try {
          parsedKey = JSON.parse(serviceAccountKey)
        } catch (e) {
          parseError = e.message
        }
      }
      
      return response.json({
        success: true,
        message: 'Configuración Firebase',
        datos: {
          service_account_key_exists: !!serviceAccountKey,
          service_account_path_exists: !!serviceAccountPath,
          service_account_key_length: serviceAccountKey?.length || 0,
          service_account_key_preview: serviceAccountKey?.substring(0, 100) + '...',
          parsed_successfully: !!parsedKey,
          parse_error: parseError,
          parsed_project_id: parsedKey?.project_id,
          parsed_client_email: parsedKey?.client_email,
          recomendacion: !parsedKey ? 'El JSON tiene saltos de línea que causan error de parseo' : 'JSON válido'
        }
      })
      
    } catch (error) {
      console.error('❌ Error depurando Firebase:', error)
      return response.status(500).json({
        success: false,
        message: 'Error depurando Firebase',
        error: error.message
      })
    }
  }

      // Obtener asignaciones actualizadas
      let asignacionesQuery = Asignacion.query()
        .where('periodo_id', periodo.id)
        .where((q) => {
          q.where('curso_id', estudiante.cursoId)
  /**
   * TEMPORAL: Probar notificación con token FCM real
   * POST /api/movil/debug/probar-con-token-real
   */
  async probarConTokenReal({ request, response }: HttpContext) {
    try { 
      console.log('📱 PROBANDO NOTIFICACIÓN CON TOKEN FCM REAL')
      
      const { token } = request.only(['token'])
      
      if (!token) {
        return response.status(400).json({
          success: false,
          message: 'Token FCM es requerido',
          ejemplo: {
            token: 'fcm_token_real_obtenido_desde_app_android'
          }
        })
        .preload('categoria')

      if (fechaFiltro && fechaFiltro.isValid) {
        asignacionesQuery = asignacionesQuery.where('actualizado_en', '>=', fechaFiltro.toSQL()!)
      }

      const asignaciones = await asignacionesQuery

      const tareasActualizadas = asignaciones.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        descripcion: a.descripcion,
        categoria: a.categoria?.nombre || 'General',
        fechaPublicacion: a.fechaInicio?.toISODate(),
        fechaVencimiento: a.fechaVencimiento?.toISODate(),
        frecuencia: a.frecuencia || 'Única',
      }))

      // Obtener entregas actualizadas
      let entregasQuery = Entrega.query()
        .where('estudiante_id', estudianteId)
        .whereIn(
          'asignacion_id',
          asignaciones.map((a) => a.id)
        )

      if (fechaFiltro && fechaFiltro.isValid) {
        entregasQuery = entregasQuery.where('actualizado_en', '>=', fechaFiltro.toSQL()!)
      
      // Buscar usuario
      const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario acudiente no encontrado'
        })
      }

      const entregas = await entregasQuery

      const entregasActualizadas = entregas.map((e) => ({
        id: e.id,
        asignacionId: e.asignacionId,
        descripcion: e.evidenciaTexto,
        fechaEntrega: e.fechaEntrega?.toISO(),
        archivos: e.archivosUrl ? JSON.parse(e.archivosUrl) : [],
      }))

      // Obtener calificaciones nuevas
      let calificacionesQuery = Calificacion.query()
        .where('estudiante_id', estudianteId)
        .where('periodo_id', periodo.id)

      if (fechaFiltro && fechaFiltro.isValid) {
        calificacionesQuery = calificacionesQuery.where('calificado_en', '>=', fechaFiltro.toSQL()!)
      
      // Inicializar Firebase directamente
      let messaging = null
      try {
        const serviceAccountKey = env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        if (serviceAccountKey) {
          const serviceAccount = JSON.parse(serviceAccountKey)
          const admin = require('firebase-admin')
          
          // Inicializar Firebase con nombre único para evitar conflictos
          const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            name: 'escuela-padres-backend'
          })
          
          messaging = admin.messaging()
          console.log('✅ Firebase inicializado correctamente')
        }
      } catch (error) {
        console.log('❌ Error inicializando Firebase:', error.message)
      }

      const calificaciones = await calificacionesQuery

      const calificacionesNuevas = calificaciones.map((c) => ({
        id: c.id,
        asignacionId: c.asignacionId,
        entregaId: c.entregaId,
        nota: c.nota,
        escala: c.escala,
        retroalimentacion: c.retroalimentacion,
        fechaCalificacion: c.calificadoEn?.toISO(),
      }))

      // TODO: Obtener IDs de tareas eliminadas/canceladas
      const tareasEliminadas: number[] = []

      return response.status(200).json({
        success: true,
      
      if (!messaging) {
        return response.json({
          success: false,
          message: 'Firebase no está configurado en el backend',
          datos: {
            error: 'No se pudo inicializar Firebase Admin SDK',
            service_account_key_exists: !!env.get('FIREBASE_SERVICE_ACCOUNT_KEY'),
            service_account_length: env.get('FIREBASE_SERVICE_ACCOUNT_KEY')?.length || 0,
            solucion: 'Verifica las credenciales de FIREBASE_SERVICE_ACCOUNT_KEY en .env'
          }
        })
      }
      
      // Enviar notificación con el token real
      const message = {
        notification: {
          title: '🎯 Notificación de Prueba',
          body: '¡Funciona! Esta notificación llegó a tu dispositivo'
        },
        data: {
          tareasActualizadas,
          tareasEliminadas,
          entregasActualizadas,
          calificacionesNuevas,
          timestamp: DateTime.now().toISO(),
          tipo: 'prueba_token_real',
          usuario_id: usuario.id.toString(),
          timestamp: new Date().toISOString(),
          mensaje: 'Si ves esto, Firebase está funcionando correctamente'
        },
      })
        token: token
      }
      
      try {
        const result = await messaging.send(message)
        console.log('✅ Notificación enviada con token real:', result)
        
        return response.json({
          success: true,
          message: '¡Notificación enviada exitosamente!',
          datos: {
            message_id: result,
            token_usado: token.substring(0, 20) + '...',
            usuario_id: usuario.id,
            nota: 'Deberías haber recibido esta notificación en tu dispositivo'
          }
        })
        
      } catch (firebaseError: any) {
        console.log('❌ Error con token FCM:', firebaseError.message)
        
        return response.json({
          success: false,
          message: 'Error enviando notificación con token FCM',
          error: firebaseError.message,
          posibles_causas: [
            'El token FCM no es válido o expiró',
            'La app no tiene permisos de notificación',
            'El proyecto Firebase no coincide con google-services.json'
          ],
          solucion: [
            '1. Obtén un nuevo token FCM desde tu app Android',
            '2. Verifica que la app tenga permisos de notificación',
            '3. Confirma que el proyecto Firebase coincida'
          ]
        })
      }
      
    } catch (error) {
      console.error('Error al sincronizar tareas:', error)
      console.error('❌ Error general:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        message: 'Error procesando la solicitud',
        error: error.message
      })
    }
  }
}
}
