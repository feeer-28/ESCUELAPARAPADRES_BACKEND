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

import Usuario from '#models/usuario'
import env from '#start/env'
import { getMessaging } from '#config/firebase'

export default class MovilController {
  // ============================================================
  // EP-07: AUTENTICACIÃ“N Y GESTIÃ“N DE PERFIL
  // ============================================================

  /**
   * Endpoint temporal para probar el servicio de hash directamente
   */
  async testHash({ response }: HttpContext) {
    try {
      const testValue = '1061705869'

      // Probar hash.make
      const hashed = await hash.make(testValue)
      console.log('🔧 Hash generado:', hashed)

      // Probar hash.verify inmediatamente
      const verification1 = await hash.verify(hashed, testValue)
      console.log('🔍 Verificación inmediata:', verification1)

      // Probar diferentes valores
      const verification2 = await hash.verify(hashed, '1061705869')
      const verification3 = await hash.verify(hashed, 'otroValor')

      console.log('🔍 Verificación con mismo string:', verification2)
      console.log('🔍 Verificación con valor incorrecto:', verification3)

      return response.json({
        success: true,
        debug: {
          testValue,
          hashedValue: hashed,
          hashedLength: hashed.length,
          verificacionInmediata: verification1,
          verificacionMismoString: verification2,
          verificacionIncorrecta: verification3,
          hashAlgorithm: 'bcrypt', // AdonisJS usa bcrypt por defecto
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error en test de hash',
        error: error.message
      })
    }
  }
  async resetearContrasena({ request, response }: HttpContext) {
    try {
      const documento = String(request.input('documento') ?? '').trim()

      if (!documento) {
        return response.json({
          success: false,
          message: 'Documento requerido'
        })
      }

      const normalize = (value: string) => value.replace(/\D+/g, '')
      const documentoNormalizado = normalize(documento)

      // Buscar acudiente
      const acudiente = await Acudiente.query()
        .where('numero_documento', documentoNormalizado)
        .preload('usuario')
        .first()

      if (!acudiente || !acudiente.usuario) {
        return response.json({
          success: false,
          message: 'Acudiente o usuario no encontrado'
        })
      }

      // Resetear contraseña al documento
      const usuario = acudiente.usuario
      const hashAnterior = usuario.contrasenaHash

      console.log('🔧 RESET DEBUG:')
      console.log('📄 Documento para hash:', JSON.stringify(documentoNormalizado))
      console.log('📏 Longitud documento:', documentoNormalizado.length)
      console.log('🔑 Caracteres del documento:', documentoNormalizado.split('').map(c => `${c}(${c.charCodeAt(0)})`))

      usuario.contrasenaHash = await hash.make(documentoNormalizado)
      usuario.debeCambiarContrasena = false
      await usuario.save()

      // Recargar usuario desde BD (importante para verificación)
      const usuarioRecargado = await Usuario.findOrFail(usuario.id)

      console.log('🔍 Hash guardado:', usuarioRecargado.contrasenaHash)
      console.log('🔍 Verificando con:', JSON.stringify(documentoNormalizado))

      // Verificar que el hash funciona
      const verificacion = await hash.verify(usuarioRecargado.contrasenaHash, documentoNormalizado)

      console.log('✅ Resultado verificación:', verificacion)

      return response.json({
        success: true,
        message: 'Contraseña reseteada',
        debug: {
          documento: documentoNormalizado,
          documentoJson: JSON.stringify(documentoNormalizado),
          documentoLength: documentoNormalizado.length,
          documentoChars: documentoNormalizado.split('').map(c => `${c}(${c.charCodeAt(0)})`),
          usuarioId: usuarioRecargado.id,
          hashAnteriorLength: hashAnterior?.length || 0,
          hashNuevoLength: usuarioRecargado.contrasenaHash?.length || 0,
          hashNuevo: usuarioRecargado.contrasenaHash,
          verificacionExitosa: verificacion,
          // Test adicional: verificar con string hardcodeado
          testVerificacion: await hash.verify(usuarioRecargado.contrasenaHash, '1061705869')
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al resetear contraseña',
        error: error.message
      })
    }
  }
  async debugAcudiente({ request, response }: HttpContext) {
    try {
      const documento = String(request.input('documento') ?? '').trim()

      if (!documento) {
        return response.json({
          success: false,
          message: 'Documento requerido'
        })
      }

      const normalize = (value: string) => value.replace(/\D+/g, '')
      const documentoNormalizado = normalize(documento)

      // Buscar acudiente
      const acudiente = await Acudiente.query()
        .where('numero_documento', documentoNormalizado)
        .preload('usuario')
        .first()

      // También buscar con documento original (por si acaso)
      const acudienteOriginal = await Acudiente.query()
        .where('numero_documento', documento)
        .preload('usuario')
        .first()

      return response.json({
        success: true,
        debug: {
          documentoOriginal: documento,
          documentoNormalizado: documentoNormalizado,
          acudienteConNormalizado: acudiente ? {
            id: acudiente.id,
            numeroDocumento: acudiente.numeroDocumento,
            nombres: acudiente.nombres,
            usuarioId: acudiente.usuarioId,
            usuario: acudiente.usuario ? {
              id: acudiente.usuario.id,
              correo: acudiente.usuario.correo,
              rolId: acudiente.usuario.rolId,
              hashLength: acudiente.usuario.contrasenaHash?.length || 0
            } : null
          } : null,
          acudienteConOriginal: acudienteOriginal ? {
            id: acudienteOriginal.id,
            numeroDocumento: acudienteOriginal.numeroDocumento,
            nombres: acudienteOriginal.nombres
          } : null
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error en debug',
        error: error.message
      })
    }
  }
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

      // Normalizar documento (quitar caracteres especiales)
      const normalize = (value: string) => value.replace(/\D+/g, '')
      const documentoNormalizado = normalize(documento)

      console.log('🔍 DEBUG LOGIN:')
      console.log('📄 Documento original:', documento)
      console.log('📄 Documento normalizado:', documentoNormalizado)
      console.log('🔑 Password:', password)

      // Buscar acudiente por número de documento normalizado - OPTIMIZADO
      const acudiente = await Acudiente.query()
        .where('numero_documento', documentoNormalizado)
        .preload('usuario')
        .first()

      console.log('👤 Acudiente encontrado:', acudiente ? 'SÍ' : 'NO')

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

      console.log('👤 ID acudiente:', acudiente.id)
      console.log('👤 Usuario ID:', usuario.id)
      console.log('🔑 Rol ID:', usuario.rolId)
      console.log('🟢 Activo:', usuario.estaActivo)

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

      console.log('🔑 Hash actual existe:', usuario.contrasenaHash ? 'SÍ' : 'NO')

      // Si no tiene hash, es primera vez - usar documento como password
      let isPasswordValid = false

      if (!usuario.contrasenaHash || usuario.contrasenaHash.trim() === '') {
        // Primera vez - hashear el documento
        const passwordNormalizado = normalize(password)
        if (passwordNormalizado === documentoNormalizado) {
          console.log('🔐 Primera vez - generando hash...')
          usuario.contrasenaHash = await hash.make(documentoNormalizado)
          usuario.debeCambiarContrasena = false
          await usuario.save()
          isPasswordValid = true
          console.log('✅ Hash generado exitosamente')
        }
      } else {
        // Verificar contraseña existente  
        isPasswordValid = await hash.verify(usuario.contrasenaHash, password)
        console.log('🔍 Verificación hash existente:', isPasswordValid)

        // Si falla, intentar con documento (por si cambió la lógica)
        if (!isPasswordValid) {
          const passwordNormalizado = normalize(password)
          if (passwordNormalizado === documentoNormalizado) {
            console.log('🔄 Intentando con documento normalizado...')
            usuario.contrasenaHash = await hash.make(documentoNormalizado)
            usuario.debeCambiarContrasena = false
            await usuario.save()
            isPasswordValid = true
            console.log('✅ Hash actualizado exitosamente')
          }
        }
      }

      if (!isPasswordValid) {
        console.log('❌ Login fallido - contraseña incorrecta')
        return response.status(401).json({
          success: false,
          message: 'Documento o contraseña incorrectos',
        })
      }

      console.log('✅ Login exitoso - generando token...')

      // Actualizar último ingreso
      usuario.ultimoIngreso = DateTime.now()
      await usuario.save()

      // Cargar estudiantes SOLO después de validación exitosa
      await acudiente.load('estudiantes', (query) => {
        query.preload('curso', (q) => {
          q.preload('grado')
          q.preload('institucion')
        })
      })

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
      console.error('Error en login mÃ³vil:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * HU-24: Cambiar contraseÃ±a obligatoriamente
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

      if (!currentPassword) errors.push('La contraseÃ±a actual es requerida')
      if (!newPassword) errors.push('La nueva contraseÃ±a es requerida')
      if (!confirmPassword) errors.push('La confirmaciÃ³n de contraseÃ±a es requerida')

      if (errors.length > 0) {
        return response.status(400).json({ success: false, errors })
      }

      // Validar que coincidan
      if (newPassword !== confirmPassword) {
        return response.status(400).json({
          success: false,
          errors: ['Las contraseÃ±as no coinciden'],
        })
      }

      const usuario = await Usuario.find(jwtUser.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Verificar contraseÃ±a actual
      const isCurrentValid = await hash.verify(usuario.contrasenaHash, currentPassword)
      if (!isCurrentValid) {
        return response.status(400).json({
          success: false,
          errors: ['La contraseÃ±a actual es incorrecta'],
        })
      }

      // Obtener documento del acudiente para validar
      const acudiente = await Acudiente.query().where('usuario_id', usuario.id).first()

      // Validar que nueva contraseÃ±a no sea el documento
      if (acudiente && newPassword === acudiente.numeroDocumento) {
        return response.status(400).json({
          success: false,
          errors: ['La nueva contraseÃ±a no puede ser tu nÃºmero de documento'],
        })
      }

      // Validar que no sea igual a la actual
      if (newPassword === currentPassword) {
        return response.status(400).json({
          success: false,
          errors: ['La nueva contraseÃ±a debe ser diferente a la actual'],
        })
      }

      // Validar requisitos de seguridad: 8+ chars, 1 mayÃºscula, 1 nÃºmero, 1 especial
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
      if (!passwordRegex.test(newPassword)) {
        return response.status(400).json({
          success: false,
          errors: [
            'La nueva contraseÃ±a debe tener al menos 8 caracteres, 1 mayÃºscula, 1 nÃºmero y 1 carÃ¡cter especial',
          ],
        })
      }

      // Actualizar contraseÃ±a
      usuario.contrasenaHash = newPassword // El hook del modelo lo hashea
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'ContraseÃ±a actualizada correctamente',
      })
    } catch (error) {
      console.error('Error al cambiar contraseÃ±a:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * HU-25: Recuperar contraseÃ±a - Solicitar OTP
   * POST /auth/recuperar/solicitar
   */
  async recuperarSolicitar({ request, response }: HttpContext) {
    try {
      const contacto = String(request.input('contacto') ?? '').trim()

      if (!contacto) {
        return response.status(400).json({
          success: false,
          message: 'El contacto (telÃ©fono o email) es requerido',
        })
      }

      // Buscar por telÃ©fono o correo
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

      // Generar cÃ³digo OTP de 6 dÃ­gitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString()
      const expiraEn = 900 // 15 minutos en segundos

      // TODO: En producciÃ³n, guardar OTP en tabla otp_codes o cache Redis
      // Por ahora solo se genera y se simula el envÃ­o

      // Determinar mÃ©todo (SMS o email)
      const metodo = contacto.includes('@') ? 'email' : 'sms'

      // TODO: Integrar con servicio SMS/Email real
      // Por ahora solo simulamos el envÃ­o
      console.log(`[OTP] CÃ³digo ${codigo} enviado a ${contacto} vÃ­a ${metodo}`)

      return response.status(200).json({
        success: true,
        message: `CÃ³digo enviado a tu ${metodo === 'sms' ? 'telÃ©fono' : 'correo'}`,
        metodo,
        expiraEn,
        // En desarrollo, retornamos el cÃ³digo para pruebas
        ...(env.get('NODE_ENV') !== 'production' && { codigoDebug: codigo }),
      })
    } catch (error) {
      console.error('Error al solicitar recuperaciÃ³n:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-25: Recuperar contraseÃ±a - Verificar OTP
   * POST /auth/recuperar/verificar
   */
  async recuperarVerificar({ request, response }: HttpContext) {
    try {
      const contacto = String(request.input('contacto') ?? '').trim()
      const codigo = String(request.input('codigo') ?? '').trim()

      if (!contacto || !codigo) {
        return response.status(400).json({
          success: false,
          message: 'Contacto y cÃ³digo son requeridos',
        })
      }

      // TODO: Verificar cÃ³digo contra BD/cache
      // Por ahora aceptamos cualquier cÃ³digo de 6 dÃ­gitos en desarrollo
      if (codigo.length !== 6) {
        return response.status(400).json({
          success: false,
          message: 'CÃ³digo invÃ¡lido',
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
      console.error('Error al verificar cÃ³digo:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  /**
   * HU-25: Recuperar contraseÃ±a - Restablecer
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
          message: 'Token y contraseÃ±as son requeridos',
        })
      }

      if (newPassword !== confirmPassword) {
        return response.status(400).json({
          success: false,
          message: 'Las contraseÃ±as no coinciden',
        })
      }

      // Validar requisitos de seguridad
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
      if (!passwordRegex.test(newPassword)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseÃ±a debe tener al menos 8 caracteres, 1 mayÃºscula, 1 nÃºmero y 1 especial',
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
          message: 'Token invÃ¡lido',
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

      // Actualizar contraseÃ±a
      usuario.contrasenaHash = newPassword
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'ContraseÃ±a restablecida. Ya puedes iniciar sesiÃ³n',
      })
    } catch (error) {
      console.error('Error al restablecer contraseÃ±a:', error)
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

      const estudiantes = acudiente.estudiantes.map((est) => ({
        id: est.id,
        nombres: est.nombres,
        apellidos: est.apellidos,
        documento: est.numeroDocumento,
        fechaNacimiento: est.fechaNacimiento?.toFormat('yyyy-MM-dd') || null,
        grado: est.curso?.grado?.nombre || null,
        firstName: est.nombres, // backward compatibility
        lastName: est.apellidos, // backward compatibility
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
      estudiantes.sort((a, b) => {
        if (a.esPrincipal && !b.esPrincipal) return -1
        if (!a.esPrincipal && b.esPrincipal) return 1
        return a.firstName.localeCompare(b.firstName)
      })

      // Estructura adaptada para app móvil: 1 estudiante = objeto, múltiples = array
      const data = estudiantes.length === 1
        ? { estudiante: estudiantes[0] }
        : { estudiantes }

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

      // Verificar que el estudiante estÃ¡ vinculado al acudiente
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

      // Resolver estudianteId: soportar alias 'me' y validar numÃ©rico
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
          message: 'ParÃ¡metro estudiante id invÃ¡lido o no disponible',
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

      // Obtener perÃ­odo activo
      const periodoActivo = await db
        .from('periodos')
        .where('esta_activo', true)
        .orderBy('id', 'desc')
        .first()

      // Calcular estadÃ­sticas del perÃ­odo activo
      let estadisticas = {
        totalTareas: 0,
        tareasCompletadas: 0,
        promedio: 0,
        escala: 'Sin datos',
      }

      if (periodoActivo) {
        // Contar asignaciones del curso en el perÃ­odo
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
        else if (promedio >= 3.0) estadisticas.escala = 'BÃ¡sico'
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
  // EP-08: VISUALIZACIÃ“N Y ENVÃO DE TAREAS
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

      // Verificar vinculaciÃ³n
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

      // Resolver estudianteId: soportar alias 'me' y validar numÃ©rico
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
          message: 'ParÃ¡metro estudiante id invÃ¡lido o no disponible',
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

      // Obtener perÃ­odo (activo o el especificado)
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

      // Si no hay asignaciones, devolver respuesta vacÃ­a evitando whereIn([])
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

        // Calcular dÃ­as restantes
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
          frecuencia: asig.frecuencia || 'Ãšnica',
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
   * HU-30: Detalle completo de una tarea/asignaciÃ³n
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

      // Obtener asignaciÃ³n con relaciones
      const asignacion = await Asignacion.query()
        .where('id', asignacionId)
        .preload('categoria')
        .preload('bancoTarea')
        .preload('curso')
        .first()

      if (!asignacion) {
        return response.status(404).json({
          success: false,
          message: 'AsignaciÃ³n no encontrada',
        })
      }

      // Verificar que el acudiente tiene acceso (algÃºn hijo en el curso)
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
      let estudianteEnCurso = acudiente.estudiantes.find(
        (e) => e.cursoId === asignacion.cursoId
      )

      if (!estudianteEnCurso) {
        // Verificar en tabla pivote
        const cursoIds = await db
          .from('asignacion_cursos')
          .where('asignacion_id', asignacionId)
          .select('curso_id')

        const cursosAsignacion = cursoIds.map((c: any) => c.curso_id)
        // Buscar el estudiante correcto que esté en uno de los cursos de la asignación
        estudianteEnCurso = acudiente.estudiantes.find((e) =>
          cursosAsignacion.includes(e.cursoId)
        )

        if (!estudianteEnCurso) {
          return response.status(403).json({
            success: false,
            message: 'No tienes acceso a esta asignación',
          })
        }
      }

      // Obtener entrega del estudiante (si existe)
      const estudianteId = estudianteEnCurso.id
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

      // Calcular estado y dÃ­as restantes
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
          frecuencia: asignacion.frecuencia || 'Ãšnica',
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


  // NOTA: enviarEntrega y editarEntrega se encuentran en movil/entregasController.ts
  // Las rutas apuntan a MovilEntregasController, no a este controlador.


  /**
   * HU-36: Historial de entregas por perÃ­odo
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

      // Verificar vinculaciÃ³n
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

      // Obtener perÃ­odo
      let periodo
      if (periodoId) {
        periodo = await db.from('periodos').where('id', periodoId).first()
      } else {
        periodo = await db.from('periodos').where('esta_activo', true).first()
      }

      if (!periodo) {
        return response.status(400).json({
          success: false,
          message: 'PerÃ­odo no encontrado',
        })
      }

      // Obtener entregas del perÃ­odo
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
        miniatura: (() => {
          const raw: any = e.archivosUrl
          if (!raw) return null
          if (Array.isArray(raw)) return raw[0] || null
          if (typeof raw === 'string') {
            const s = raw.trim()
            if (!s || s === '[object Object]') return null
            if (s.startsWith('[') || s.startsWith('{')) {
              try { return JSON.parse(s)[0] || null } catch { return null }
            }
            return null
          }
          return null
        })(),
        calificacion: e.calificacion
          ? {
            nota: e.calificacion.nota,
            escala: e.calificacion.escala,
          }
          : null,
      }))

      // Calcular estadÃ­sticas
      const estudiante = await Estudiante.find(estudianteId)
      const totalAsignaciones = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where((q) => {
          if (estudiante?.cursoId) {
            q.where('curso_id', estudiante.cursoId)
              .orWhereIn('id',
                db.from('asignacion_cursos')
                  .where('curso_id', estudiante.cursoId)
                  .select('asignacion_id')
              )
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
      else if (promedio >= 3.0) escala = 'BÃ¡sico'
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
   * HU-37: EstadÃ­sticas de desempeÃ±o
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

      const rawEstudianteId = params.id
      const periodoId = request.input('periodo')

      // Verificar vinculaciÃ³n
      const acudiente = await Acudiente.query()
        .where('usuario_id', jwtUser.id)
        .preload('estudiantes')
        .first()

      if (!acudiente) {
        return response.status(404).json({ success: false, message: 'Acudiente no encontrado' })
      }

      // Resolver estudianteId: soportar alias 'me'
      let estudianteId: number | null = null
      if (rawEstudianteId === 'me') {
        estudianteId = acudiente.estudiantes[0]?.id || null
      } else {
        const parsed = Number(rawEstudianteId)
        estudianteId = Number.isFinite(parsed) ? parsed : null
      }

      if (!estudianteId) {
        return response.status(400).json({ success: false, message: 'ID de estudiante inválido' })
      }

      const esVinculado = acudiente.estudiantes.some((e) => e.id === estudianteId)
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

      // Obtener perÃ­odo
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

      // Total de tareas del período para el curso (incluyendo multi-curso via pivot)
      const totalAsignaciones = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where((q) => {
          q.where('curso_id', estudiante.cursoId)
            .orWhereIn('id',
              db.from('asignacion_cursos')
                .where('curso_id', estudiante.cursoId)
                .select('asignacion_id')
            )
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

      // Tareas vencidas sin entregar (incluyendo multi-curso)
      const now = DateTime.now()
      const entregaIds = entregas.map((e) => e.asignacionId)
      const asignacionesVencidas = await db
        .from('asignaciones')
        .where('periodo_id', periodo.id)
        .where((q) => {
          q.where('curso_id', estudiante.cursoId)
            .orWhereIn('id',
              db.from('asignacion_cursos')
                .where('curso_id', estudiante.cursoId)
                .select('asignacion_id')
            )
        })
        .where('fecha_vencimiento', '<', now.toSQL())
        .if(entregaIds.length > 0, (query) => {
          query.whereNotIn('id', entregaIds)
        })
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
      else if (promedio >= 3.0) escala = 'BÃ¡sico'
      else if (promedio > 0) escala = 'Bajo'

      // DistribuciÃ³n de notas
      const distribucionNotas = {
        alto: notas.filter((n) => n >= 4.0).length,
        medio: notas.filter((n) => n >= 3.0 && n < 4.0).length,
        bajo: notas.filter((n) => n < 3.0).length,
      }

      // Usar calificaciones ya consultadas para contar calificadas
      const tareasCalificadasCount = calificaciones.length

      const estadisticas = {
        pendientes: Math.max(0, tareasPendientes),
        vencidas: tareasVencidas,
        completadas: tareasCompletadas,
        entregadas: tareasCompletadas - tareasCalificadasCount,
        calificadas: tareasCalificadasCount,
      }
      const totalPorAtender = estadisticas.pendientes + estadisticas.vencidas

      return response.status(200).json({
        success: true,
        data: {
          periodo: { id: periodo.id, nombre: periodo.nombre },
          estudianteId: estudiante.id,
          estadisticas,
          total: {
            porAtender: totalPorAtender,
            completadas: tareasCompletadas,
          },
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
      console.error('Error al obtener estadÃ­sticas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
      })
    }
  }

  // ============================================================
  // EP-10: NOTIFICACIONES
  // EP-10: NOTIFICACIONES PUSH (IMPLEMENTACIÃ“N COMPLETA)
  // ============================================================

  /**
   * HU-38: Registrar token FCM para push notifications
   * POST /api/movil/notificaciones/token
   * Input: { fcmToken, dispositivo?, sistemaOperativo?, versionApp? }
   */
  async registrarTokenFCM(ctx: HttpContext) {
    try {
      const { request, response } = ctx
      const jwtUser = (ctx as any).jwtUser || (ctx as any).authUser || (ctx as any).user

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
        'versionApp',
        'plataforma' // ✅ Nuevo campo
      ])
      console.log('[DEBUG] registrarTokenFCM Payload:', JSON.stringify(payload))

      // Validación simple
      if (!payload.fcmToken) {
        return response.status(400).json({
          success: false,
          message: 'El token FCM es requerido'
        })
      }

      console.log(`[FCM] Registrando token para usuario ${jwtUser.id}`)

      // Actualizar usuario con token FCM (Backup)
      const usuario = await Usuario.find(jwtUser.id)
      if (usuario) {
        usuario.tokenFcm = payload.fcmToken
        await usuario.save()
      }

      // Registrar en dispositivos_moviles
      let plataforma = payload.plataforma || payload.sistemaOperativo || 'Android'
      if (plataforma.length > 20) plataforma = plataforma.substring(0, 20)
      console.log('[DEBUG] Plataforma procesada:', plataforma)

      const existe = await db.from('dispositivos_moviles')
        .where('token_fcm', payload.fcmToken)
        .first()

      if (existe) {
        await db.from('dispositivos_moviles')
          .where('token_fcm', payload.fcmToken)
          .update({
            usuario_id: jwtUser.id,
            plataforma,
            version_app: payload.versionApp || '1.0.0',
            activo: true,
            actualizado_en: DateTime.now().toSQL()
          })
      } else {
        await db.table('dispositivos_moviles').insert({
          token_fcm: payload.fcmToken,
          usuario_id: jwtUser.id,
          plataforma,
          version_app: payload.versionApp || '1.0.0',
          activo: true,
          creado_en: DateTime.now().toSQL(),
          actualizado_en: DateTime.now().toSQL()
        })
      }

      console.log(`[FCM] Token ${payload.fcmToken} registrado exitosamente`)

      return response.status(201).json({
        success: true,
        message: 'Token FCM registrado exitosamente',
        data: { tokenRegistrado: true }
      })
    } catch (error) {
      console.error('Error al registrar token FCM:', error)
      return ctx.response.status(500).json({ success: false, message: 'Error al registrar token FCM', error: error.message })
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
      }

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

      // PaginaciÃ³n
      const offset = (Number(page) - 1) * Number(limit)
      const notificaciones = await query.limit(Number(limit)).offset(offset)

      // Contar total
      const totalCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .if(tipo, (q) => q.where('tipo', tipo))
        .if(leida !== undefined, (q) => q.where('leida', leida === 'true'))
        .count('* as total')
        .first()

      // Contar no leÃ­das
      const noLeidasCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .count('* as total')
        .first()

      return response.json({
        success: true,
        data: notificaciones.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          titulo: n.titulo || this.getTituloNotificacion(n.tipo),
          mensaje: n.cuerpo,
          datos: n.datos ? (typeof n.datos === 'string' ? JSON.parse(n.datos) : n.datos) : null,
          leida: n.leida,
          leidaEn: n.leida_en,
          creadaEn: n.creada_en,
        })),
        meta: {
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
        message: 'Error al listar notificaciones',
        error: error.message
      })
    }
  }

  private getTituloNotificacion(tipo: string): string {
    const titulos: Record<string, string> = {
      nueva_tarea: 'ðŸ†• Nueva tarea asignada',
      calificacion: 'ðŸ“ Tarea calificada',
      recordatorio: 'â° Recordatorio',
      vencida: 'âš ï¸ Tarea vencida',
      entrega: 'ðŸ“¤ Entrega recibida',
    }
    return titulos[tipo] || 'NotificaciÃ³n'
  }

  /**
   * HU-39: Marcar notificaciÃ³n como leÃ­da
   * PUT /notificaciones/:id/leer
   * HU-39: Marcar notificaciÃ³n individual como leÃ­da
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

      // Verificar que la notificaciÃ³n exista y pertenezca al usuario
      const notificacion = await db.from('notificaciones_push')
        .where('id', notificacionId)
        .where('usuario_id', jwtUser.id)
        .first()

      if (!notificacion) {
        return response.status(404).json({
          success: false,
          message: 'NotificaciÃ³n no encontrada'
        })
      }

      if (notificacion.leida) {
        return response.json({
          success: true,
          message: 'NotificaciÃ³n ya estaba marcada como leÃ­da',
          data: notificacion
        })
      }

      // Marcar como leÃ­da
      await db.from('notificaciones_push')
        .where('id', notificacionId)
        .update({
          leida: true,
          leida_en: DateTime.now().toSQL()
        })

      // Obtener notificaciÃ³n actualizada
      const notificacionActualizada = await db.from('notificaciones_push')
        .where('id', notificacionId)
        .first()

      return response.json({
        success: true,
        message: 'NotificaciÃ³n marcada como leÃ­da',
        data: notificacionActualizada
      })
    } catch (error) {
      console.error('Error al marcar notificaciÃ³n como leÃ­da:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al marcar notificaciÃ³n como leÃ­da',
        error: error.message
      })
    }
  }

  /**
   * HU-39: Marcar todas las notificaciones como leÃ­das
   * PUT /api/movil/notificaciones/leer-todas
   */
  async marcarTodasLeidas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'No autenticado',
        })
      }

      // Contar notificaciones no leÃ­das
      const noLeidasCount = await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .count('* as total')
        .first()

      const cantidad = Number(noLeidasCount?.total || 0)

      if (cantidad === 0) {
        return response.json({
          success: true,
          message: 'No hay notificaciones pendientes por marcar como leÃ­das',
          data: { cantidad: 0 }
        })
      }

      // Marcar todas como leÃ­das
      await db.from('notificaciones_push')
        .where('usuario_id', jwtUser.id)
        .where('leida', false)
        .update({
          leida: true,
          leida_en: DateTime.now().toSQL()
        })

      return response.json({
        success: true,
        message: `${cantidad} notificaciones marcadas como leÃ­das`,
        data: { cantidad }
      })
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leÃ­das:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al marcar notificaciones como leÃ­das',
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
      }
      // Obtener preferencias del usuario (usar tabla de configuraciÃ³n si existe)
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
        success: true,
        data: preferencias
      })
    } catch (error) {
      console.error('Error al obtener preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
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
          success: false,
          message: 'No autenticado',
        })
      }
      const preferencias = request.input('notificaciones')
      // ValidaciÃ³n bÃ¡sica
      if (!preferencias || typeof preferencias !== 'object') {
        return response.status(400).json({
          success: false,
          message: 'Se requiere el objeto de preferencias'
        })
      }
      // AquÃ­ se guardarÃ­an las preferencias en una tabla de configuraciÃ³n
      // Por ahora, solo simulamos la actualizaciÃ³n
      console.log(`Preferencias actualizadas para usuario ${jwtUser.id}:`, preferencias)
      // TODO: Guardar en BD cuando se implemente tabla preferencias_usuario
      return response.status(200).json({
        success: true,
        message: 'Preferencias actualizadas exitosamente',
        data: preferencias
      })
    } catch (error) {
      console.error('Error al actualizar preferencias:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar preferencias',
        error: error.message
      })
    }
  }

  /**
   * HU-42: InformaciÃ³n de soporte
   * GET /soporte/info
   * HU-42: InformaciÃ³n de contacto de soporte
   * GET /api/movil/soporte/info
   */
  async infoSoporte({ response }: HttpContext) {
    try {
      return response.status(200).json({
        success: true,
        data: {
          email: 'parchandojuntos2025@gmail.com',
          whatsapp: '+573107392818',
          horarioAtencion: 'Lunes a Viernes 8:00 - 17:00',
        },
      })
    } catch (error) {
      console.error('Error al obtener info de soporte:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener informaciÃ³n de soporte'
      })
    }
  }

  // ============================================================
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
      const dispositivos = await db.from('dispositivos_moviles')
        .where('usuario_id', usuarioId)
        .where('activo', true)
        .select('token_fcm')

      if (dispositivos.length === 0) {
        console.log(`No hay dispositivos activos para el usuario ${usuarioId}`)
        return
      }

      const [notificacionResult] = await db.table('notificaciones_push').insert({
        usuario_id: usuarioId,
        titulo,
        cuerpo,
        tipo,
        datos: JSON.stringify(datos),
        leida: false,
        creada_en: DateTime.now().toSQL()
      }).returning('id')

      const messaging = getMessaging()
      if (messaging) {
        console.log(`[DEBUG] Intentando enviar push a ${dispositivos.length} dispositivos. Datos:`, JSON.stringify(datos))
        const tokens = dispositivos.map(d => d.token_fcm)
        const message = {
          notification: { title: titulo, body: cuerpo },
          data: { ...datos, tipo, notificacionId: notificacionResult?.id?.toString() || '' },
          tokens: tokens
        }

        try {
          const result = await (messaging as any).sendMulticast(message)
          console.log(`NotificaciÃ³n enviada: ${result.successCount}/${tokens.length} exitosos`)
        } catch (error) {
          console.error('Error al enviar notificaciÃ³n push:', error)
        }
      } else {
        console.warn('Firebase Messaging no disponible')
      }
    } catch (error) {
      console.error('Error en enviarNotificacionPush:', error)
    }
  }

  /**
   * GET /debug/fix-schema
   * Emergencia: Corregir schema de notificaciones sin acceso a consola
   */
  async fixSchema({ response }: HttpContext) {
    try {
      const tableName = 'notificaciones_push'
      const schema = db.connection().schema
      const hasTable = await schema.hasTable(tableName)

      if (!hasTable) {
        return response.json({ message: 'La tabla notificaciones_push no existe' })
      }

      const hasMensaje = await schema.hasColumn(tableName, 'mensaje')
      const hasCuerpo = await schema.hasColumn(tableName, 'cuerpo')
      const hasDatos = await schema.hasColumn(tableName, 'datos')

      const log: string[] = []

      await schema.alterTable(tableName, (table) => {
        // Rename mensaje -> cuerpo
        if (hasMensaje && !hasCuerpo) {
          table.renameColumn('mensaje', 'cuerpo')
          log.push('Columna mensaje renombrada a cuerpo')
        }

        // Add datos if missing
        if (!hasDatos) {
          table.text('datos').nullable()
          log.push('Columna datos agregada')
        }
      })

      return response.json({
        success: true,
        message: 'Verificación de schema completada',
        acciones: log,
        estadoActual: {
          hasCuerpo: await schema.hasColumn(tableName, 'cuerpo'),
          hasDatos: await schema.hasColumn(tableName, 'datos')
        }
      })
    } catch (error) {
      return response.status(500).json({ error: error.message, stack: error.stack })
    }
  }
  /**
   * GET /debug/fix-schema-sql
   * Fuerza la correcciÃ³n con RAW SQL (Alternativa)
   */
  async fixSchemaSQL({ response }: HttpContext) {
    try {
      const logs: string[] = []

      try {
        await db.raw('ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS cuerpo TEXT;')
        logs.push('ALTER TABLE ... ADD COLUMN cuerpo (OK)')
      } catch (e: any) { logs.push('Error cuerpo: ' + e.message) }

      try {
        await db.raw('ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS datos TEXT;')
        logs.push('ALTER TABLE ... ADD COLUMN datos (OK)')
      } catch (e: any) { logs.push('Error datos: ' + e.message) }

      try {
        await db.raw('UPDATE notificaciones_push SET cuerpo = mensaje WHERE cuerpo IS NULL AND mensaje IS NOT NULL;')
        logs.push('UPDATE ... SET cuerpo=mensaje (OK)')
      } catch (e) { logs.push('UPDATE omitido (quizas mensaje no existe)') }

      return response.json({ success: true, message: 'Fix SQL ejecutado', logs })
    } catch (error) {
      return response.status(500).json({ error: error.message, stack: error.stack })
    }
  }
}
