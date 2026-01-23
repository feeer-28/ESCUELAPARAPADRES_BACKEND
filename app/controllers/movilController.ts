import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Entrega from '#models/entrega'
import Estudiante from '#models/estudiante'
import Notificacion from '#models/notificacion'
import Usuario from '#models/usuario'
import env from '#start/env'

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

      const estudianteId = params.id

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

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      // Obtener estudiante con relaciones
      const estudiante = await Estudiante.query()
        .where('id', estudianteId)
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
          .where('estudiante_id', estudianteId)
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
          .where('estudiante_id', estudianteId)
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

      const estudianteId = params.id
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

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      const estudiante = await Estudiante.find(estudianteId)
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

      // Obtener entregas y calificaciones del estudiante
      const entregas = await Entrega.query()
        .where('estudiante_id', estudianteId)
        .whereIn(
          'asignacion_id',
          asignaciones.map((a) => a.id)
        )

      const calificaciones = await Calificacion.query()
        .where('estudiante_id', estudianteId)
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
  async detalleAsignacion({ params, response, jwtUser }: HttpContext) {
    try {
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

          entrega = {
            id: entregaDb.id,
            descripcion: entregaDb.evidenciaTexto,
            fechaEntrega: entregaDb.fechaEntrega?.toISO(),
            archivos: entregaDb.archivosUrl ? JSON.parse(entregaDb.archivosUrl) : [],
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
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-31: Enviar evidencia de tarea
   * POST /asignaciones/:id/entregas
   */
  async enviarEntrega({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const asignacionId = params.id
      const estudianteId = request.input('estudianteId') || request.input('estudiante_id')
      const descripcion = request.input('descripcion') || request.input('evidenciaTexto')
      const archivos = request.input('archivos') || request.input('archivosUrl')

      if (!estudianteId) {
        return response.status(400).json({
          success: false,
          errors: ['El estudianteId es requerido'],
        })
      }

      if (!descripcion && !archivos) {
        return response.status(400).json({
          success: false,
          errors: ['Debes agregar una descripción o al menos un archivo'],
        })
      }

      // Verificar vinculación acudiente-estudiante
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

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'Este estudiante no está vinculado a tu cuenta',
        })
      }

      // Verificar que la asignación existe
      const asignacion = await Asignacion.find(asignacionId)
      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'Asignación no encontrada',
        })
      }

      // Verificar que no esté ya calificada
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

      // Verificar si ya existe entrega (actualizar en lugar de crear)
      let entrega = await Entrega.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()

      const archivosJson = archivos ? JSON.stringify(archivos) : null

      if (entrega) {
        // Actualizar entrega existente
        entrega.evidenciaTexto = descripcion || entrega.evidenciaTexto
        entrega.archivosUrl = archivosJson || entrega.archivosUrl
        entrega.fechaEntrega = DateTime.now()
        await entrega.save()
      } else {
        // Crear nueva entrega
        entrega = await Entrega.create({
          asignacionId: Number(asignacionId),
          estudianteId: Number(estudianteId),
          acudienteId: acudiente.id,
          evidenciaTexto: descripcion,
          archivosUrl: archivosJson,
          fechaEntrega: DateTime.now(),
          estado: 'enviada',
          institucionId: asignacion.institucionId,
          nombreEnvio: `${acudiente.nombres} ${acudiente.apellidos}`,
        })
      }

      // Crear notificación para el docente
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

      return response.status(201).json({
        success: true,
        message: 'Evidencia enviada correctamente',
        data: {
          id: entrega.id,
          descripcion: entrega.evidenciaTexto,
          fechaEntrega: entrega.fechaEntrega?.toISO(),
          archivos: entrega.archivosUrl ? JSON.parse(entrega.archivosUrl) : [],
          estado: 'entregada',
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

      // Manejar archivos
      let archivosActuales = entrega.archivosUrl ? JSON.parse(entrega.archivosUrl) : []

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
  // ============================================================

  /**
   * HU-38: Registrar token FCM
   * POST /notificaciones/token
   */
  async registrarTokenFCM({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const fcmToken = request.input('fcmToken')
      const dispositivo = request.input('dispositivo')
      const sistemaOperativo = request.input('sistemaOperativo')

      if (!fcmToken) {
        return response.status(400).json({
          success: false,
          message: 'fcmToken es requerido',
        })
      }

      const usuario = await Usuario.find(jwtUser.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      usuario.tokenFcm = fcmToken
      await usuario.save()

      // Log del dispositivo (opcional - para debugging)
      console.log(`[FCM] Token registrado para usuario ${usuario.id}: ${dispositivo} - ${sistemaOperativo}`)

      return response.status(200).json({
        success: true,
        message: 'Token registrado correctamente',
      })
    } catch (error) {
      console.error('Error al registrar token:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-38: Listar notificaciones
   * GET /notificaciones
   */
  async listarNotificaciones({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      const notificaciones = await Notificacion.query()
        .where('destinatario_id', jwtUser.id)
        .orderBy('creado_en', 'desc')
        .paginate(page, limit)

      const noLeidas = await Notificacion.query()
        .where('destinatario_id', jwtUser.id)
        .whereNull('leido_en')
        .count('* as total')

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
        success: true,
        data,
        meta: {
          total: notificaciones.total,
          noLeidas: Number(noLeidas[0]?.$extras?.total || 0),
          page: notificaciones.currentPage,
          limit: notificaciones.perPage,
        },
      })
    } catch (error) {
      console.error('Error al listar notificaciones:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
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
   */
  async marcarLeida({ params, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const notificacion = await Notificacion.query()
        .where('id', params.id)
        .where('destinatario_id', jwtUser.id)
        .first()

      if (!notificacion) {
        return response.status(404).json({
          success: false,
          message: 'Notificación no encontrada',
        })
      }

      notificacion.leidoEn = DateTime.now()
      notificacion.estado = 'leida'
      await notificacion.save()

      return response.status(200).json({
        success: true,
      })
    } catch (error) {
      console.error('Error al marcar leída:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-39: Marcar todas como leídas
   * PUT /notificaciones/leer-todas
   */
  async marcarTodasLeidas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const updated = await db
        .from('notificaciones')
        .where('destinatario_id', jwtUser.id)
        .whereNull('leido_en')
        .update({
          leido_en: DateTime.now().toSQL(),
          estado: 'leida',
        })

      return response.status(200).json({
        success: true,
        message: `${updated} notificaciones marcadas como leídas`,
      })
    } catch (error) {
      console.error('Error al marcar todas leídas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-40: Obtener preferencias de usuario
   * GET /usuarios/preferencias
   */
  async obtenerPreferencias({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      // Por ahora retornamos valores por defecto
      // TODO: Crear tabla preferencias_usuario si se requiere persistencia
      return response.status(200).json({
        success: true,
        data: {
          notificaciones: {
            nuevasTareas: true,
            calificaciones: true,
            recordatorios: true,
          },
        },
      })
    } catch (error) {
      console.error('Error al obtener preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-40: Actualizar preferencias de usuario
   * PUT /usuarios/preferencias
   */
  async actualizarPreferencias({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const preferencias = request.input('notificaciones')

      // TODO: Guardar en BD cuando se implemente tabla preferencias_usuario
      console.log(`[Preferencias] Usuario ${jwtUser.id}:`, preferencias)

      return response.status(200).json({
        success: true,
        message: 'Preferencias actualizadas',
      })
    } catch (error) {
      console.error('Error al actualizar preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-42: Información de soporte
   * GET /soporte/info
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
  }

  // ============================================================
  // MODO OFFLINE (EP-08)
  // ============================================================

  /**
   * HU-32: Sincronizar entrega creada offline
   * POST /asignaciones/:id/entregas/sync
   */
  async sincronizarEntrega({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const asignacionId = params.id
      const estudianteId = request.input('estudianteId') || request.input('estudiante_id')
      const descripcion = request.input('descripcion') || request.input('evidenciaTexto')
      const archivos = request.input('archivos') || request.input('archivosUrl')
      const timestampLocal = request.input('timestampLocal')

      if (!estudianteId) {
        return response.status(400).json({
          success: false,
          errors: ['El estudianteId es requerido'],
        })
      }

      // Verificar vinculación acudiente-estudiante
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

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'Este estudiante no está vinculado a tu cuenta',
        })
      }

      // Verificar asignación
      const asignacion = await Asignacion.find(asignacionId)
      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'Asignación no encontrada',
        })
      }

      // Parsear timestamp local (no puede ser futuro)
      let fechaEntrega = DateTime.now()
      if (timestampLocal) {
        const fechaLocal = DateTime.fromISO(timestampLocal)
        if (fechaLocal.isValid && fechaLocal <= DateTime.now()) {
          fechaEntrega = fechaLocal
        }
      }

      // Verificar si ya existe entrega
      let entrega = await Entrega.query()
        .where('asignacion_id', asignacionId)
        .where('estudiante_id', estudianteId)
        .first()

      const archivosJson = archivos ? JSON.stringify(archivos) : null

      if (entrega) {
        // Actualizar entrega existente (modo offline pudo crear una nueva mientras había otra)
        entrega.evidenciaTexto = descripcion || entrega.evidenciaTexto
        entrega.archivosUrl = archivosJson || entrega.archivosUrl
        // Mantener la fecha más antigua (la del modo offline)
        if (entrega.fechaEntrega && fechaEntrega < entrega.fechaEntrega) {
          entrega.fechaEntrega = fechaEntrega
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
      }

      return response.status(201).json({
        success: true,
        message: 'Entrega sincronizada correctamente',
        data: {
          id: entrega.id,
          fechaEntrega: entrega.fechaEntrega?.toISO(),
          sincronizado: true,
        },
      })
    } catch (error) {
      console.error('Error al sincronizar entrega:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-34: Obtener datos para caché offline
   * GET /estudiantes/:id/tareas/sync
   */
  async sincronizarTareas({ params, request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      const estudianteId = params.id
      const ultimaSync = request.input('ultimaSync')

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

      const esVinculado = acudiente.estudiantes.some((e) => e.id === Number(estudianteId))
      if (!esVinculado) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este estudiante',
        })
      }

      const estudiante = await Estudiante.find(estudianteId)
      if (!estudiante) {
        return response.status(404).json({
          success: false,
          message: 'Estudiante no encontrado',
        })
      }

      // Obtener período activo
      const periodo = await db.from('periodos').where('esta_activo', true).first()
      if (!periodo) {
        return response.status(200).json({
          success: true,
          data: {
            tareasActualizadas: [],
            tareasEliminadas: [],
            entregasActualizadas: [],
            calificacionesNuevas: [],
            timestamp: DateTime.now().toISO(),
          },
        })
      }

      // Filtrar por última sincronización si se proporciona
      let fechaFiltro: DateTime | null = null
      if (ultimaSync) {
        fechaFiltro = DateTime.fromISO(ultimaSync)
      }

      // Obtener asignaciones actualizadas
      let asignacionesQuery = Asignacion.query()
        .where('periodo_id', periodo.id)
        .where((q) => {
          q.where('curso_id', estudiante.cursoId)
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
        data: {
          tareasActualizadas,
          tareasEliminadas,
          entregasActualizadas,
          calificacionesNuevas,
          timestamp: DateTime.now().toISO(),
        },
      })
    } catch (error) {
      console.error('Error al sincronizar tareas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }
}
