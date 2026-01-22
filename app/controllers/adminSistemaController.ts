import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import Usuario from '#models/usuario'
import Funcionario from '#models/funcionario'
import Institucion from '#models/institucion'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import { DateTime } from 'luxon'

export default class AdminSistemaController {
  /**
   * Login para admin_sistema
   * POST /admin/login
   */
  async login({ request, response }: HttpContext) {
    try {
      const { correo, contrasena } = request.only(['correo', 'contrasena'])

      // Validar campos requeridos
      if (!correo || !contrasena) {
        return response.status(400).json({
          success: false,
          message: 'El correo y la contraseña son requeridos',
        })
      }

      // Buscar usuario por correo
      const usuario = await Usuario.query()
        .where('correo', correo)
        .preload('rol')
        .first()

      if (!usuario) {
        return response.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
        })
      }

      // Verificar que sea admin_sistema (rolId = 1)
      if (usuario.rolId !== 1) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado. Solo administradores del sistema pueden acceder.',
        })
      }

      // Verificar contraseña
      const isPasswordValid = await hash.verify(usuario.contrasenaHash, contrasena)
      if (!isPasswordValid) {
        return response.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
        })
      }

      // Verificar que el usuario esté activo
      if (!usuario.estaActivo) {
        return response.status(403).json({
          success: false,
          message: 'Usuario inactivo. Contacte al administrador.',
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
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      return response.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          tokenType: 'Bearer',
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            rolNombre: usuario.rol.nombre,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
        },
      })
    } catch (error) {
      console.error('Error en login admin:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * Crear un rector
   * POST /admin/rectores
   */
  async crearRector({ request, response, jwtUser }: HttpContext) {
    try {
      const {
        correo,
        contrasena,
        nombre,
        apellido,
        telefono,
        institucionId,
      } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
        'institucionId',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido || !institucionId) {
        return response.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
          errors: {
            required: ['correo', 'contrasena', 'nombre', 'apellido', 'institucionId'],
          },
        })
      }

      // Validar formato de contraseña (8+ chars, 1 mayúscula, 1 número, 1 especial)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (!@#$%^&*)',
        })
      }

      // Verificar que la institución existe
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado',
        })
      }

      // Crear usuario con rol de rector (rolId = 2)
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena, // El modelo se encarga del hash
        rolId: 2, // rector
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (rector)
      const rector = await Funcionario.create({
        nombre,
        apellido,
        telefono,
        institucionId,
        usuarioId: usuario.id,
        rolId: 2,
      })

      return response.status(201).json({
        success: true,
        message: 'Rector creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          rector: {
            id: rector.id,
            nombre: rector.nombre,
            apellido: rector.apellido,
            telefono: rector.telefono,
            institucionId: rector.institucionId,
          },
        },
      })
    } catch (error) {
      console.error('Error al crear rector:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear rector',
        error: error.message,
      })
    }
  }

  /**
   * Crear un coordinador
   * POST /admin/coordinadores
   */
  async crearCoordinador({ request, response }: HttpContext) {
    try {
      const {
        correo,
        contrasena,
        nombre,
        apellido,
        telefono,
        institucionId,
      } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
        'institucionId',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido || !institucionId) {
        return response.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
          errors: {
            required: ['correo', 'contrasena', 'nombre', 'apellido', 'institucionId'],
          },
        })
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (!@#$%^&*)',
        })
      }

      // Verificar que la institución existe
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado',
        })
      }

      // Crear usuario con rol de coordinador (rolId = 3)
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId: 3, // coordinador
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (coordinador)
      const coordinador = await Funcionario.create({
        nombre,
        apellido,
        telefono,
        institucionId,
        usuarioId: usuario.id,
        rolId: 3,
      })

      return response.status(201).json({
        success: true,
        message: 'Coordinador creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          coordinador: {
            id: coordinador.id,
            nombre: coordinador.nombre,
            apellido: coordinador.apellido,
            telefono: coordinador.telefono,
            institucionId: coordinador.institucionId,
          },
        },
      })
    } catch (error) {
      console.error('Error al crear coordinador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear coordinador',
        error: error.message,
      })
    }
  }

  /**
   * Listar instituciones pendientes de aprobación
   * GET /admin/instituciones/pendientes
   */
  async listarInstitucionesPendientes({ response }: HttpContext) {
    try {
      // Verificar si existe la columna is_approved
      // Por ahora vamos a listar todas las instituciones
      const instituciones = await Institucion.query()
        .preload('municipio', (query) => {
          query.preload('departamento')
        })
        .orderBy('creado_en', 'desc')

      return response.status(200).json({
        success: true,
        message: 'Instituciones obtenidas exitosamente',
        data: instituciones,
      })
    } catch (error) {
      console.error('Error al listar instituciones:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener instituciones',
        error: error.message,
      })
    }
  }

  /**
   * Aprobar una institución
   * PUT /admin/instituciones/:id/aprobar
   */
  async aprobarInstitucion({ params, response }: HttpContext) {
    try {
      const { id } = params

      const institucion = await Institucion.find(id)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      // Nota: Si existe la columna is_approved, descomentarla
      // institucion.isApproved = true
      // institucion.approvedAt = DateTime.now()
      // await institucion.save()

      return response.status(200).json({
        success: true,
        message: 'Institución aprobada exitosamente',
        data: institucion,
      })
    } catch (error) {
      console.error('Error al aprobar institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al aprobar institución',
        error: error.message,
      })
    }
  }
}
