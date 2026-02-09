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
  async crearRector({ request, response }: HttpContext) {
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

  /**
   * Crear un orientador
   * POST /admin/orientadores
   */
  async crearOrientador({ request, response }: HttpContext) {
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

      // Verificar que exista un rector en la institución antes de crear orientador
      const tieneRector = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 2)
        .first()

      if (!tieneRector) {
        return response.status(400).json({
          success: false,
          message: 'Debe crear primero un rector para la institución antes de asignar orientadores',
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

      // Crear usuario con rol de orientador (rolId = 4)
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId: 4, // orientador
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (orientador)
      const orientador = await Funcionario.create({
        nombre,
        apellido,
        telefono,
        institucionId,
        usuarioId: usuario.id,
        rolId: 4,
      })

      return response.status(201).json({
        success: true,
        message: 'Orientador creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          orientador: {
            id: orientador.id,
            nombre: orientador.nombre,
            apellido: orientador.apellido,
            telefono: orientador.telefono,
            institucionId: orientador.institucionId,
          },
        },
      })
    } catch (error) {
      console.error('Error al crear orientador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear orientador',
        error: error.message,
      })
    }
  }

  /**
   * Crear un usuario genérico (cualquier rol)
   * POST /admin/usuarios
   */
  async crearUsuario({ request, response }: HttpContext) {
    try {
      const {
        correo,
        contrasena,
        rolId,
        nombre,
        apellido,
        telefono,
        institucionId,
      } = request.only([
        'correo',
        'contrasena',
        'rolId',
        'nombre',
        'apellido',
        'telefono',
        'institucionId',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !rolId) {
        return response.status(400).json({
          success: false,
          message: 'Correo, contraseña y rol son requeridos',
          errors: {
            required: ['correo', 'contrasena', 'rolId'],
          },
        })
      }

      // Validar rol válido (1-6)
      if (![1, 2, 3, 4, 5, 6].includes(Number(rolId))) {
        return response.status(400).json({
          success: false,
          message: 'Rol inválido. Debe ser: 1 (admin), 2 (rector), 3 (coordinador), 4 (orientador), 5 (docente), 6 (acudiente)',
        })
      }

      // Roles 2, 3, 4 requieren institución
      if ([2, 3, 4].includes(Number(rolId)) && !institucionId) {
        return response.status(400).json({
          success: false,
          message: 'Los roles rector, coordinador y orientador requieren una institución',
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

      // Verificar que la institución existe (si se proporciona)
      if (institucionId) {
        const institucion = await Institucion.find(institucionId)
        if (!institucion) {
          return response.status(404).json({
            success: false,
            message: 'Institución no encontrada',
          })
        }

        // Verificar jerarquía: para roles 3, 4, 5, 6 debe existir un rector
        if ([3, 4, 5, 6].includes(Number(rolId))) {
          const tieneRector = await Funcionario.query()
            .where('institucion_id', institucionId)
            .where('rol_id', 2)
            .first()

          if (!tieneRector) {
            const rolesMap: { [key: number]: string } = {
              3: 'coordinadores',
              4: 'orientadores',
              5: 'docentes',
              6: 'acudientes',
            }
            const rolNombre = rolesMap[Number(rolId)] || 'este rol'

            return response.status(400).json({
              success: false,
              message: `Debe crear primero un rector para la institución antes de asignar ${rolNombre}`,
            })
          }
        }
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado',
        })
      }

      // Crear usuario
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId: Number(rolId),
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario si es rol 2, 3 o 4 (rector, coordinador, orientador)
      let funcionario = null
      if ([2, 3, 4].includes(Number(rolId)) && nombre && apellido) {
        funcionario = await Funcionario.create({
          nombre,
          apellido,
          telefono,
          institucionId,
          usuarioId: usuario.id,
          rolId: Number(rolId),
        })
      }

      // Cargar rol para la respuesta
      await usuario.load('rol')

      return response.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            rolNombre: usuario.rol.nombre,
            estaActivo: usuario.estaActivo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          ...(funcionario && {
            funcionario: {
              id: funcionario.id,
              nombre: funcionario.nombre,
              apellido: funcionario.apellido,
              telefono: funcionario.telefono,
              institucionId: funcionario.institucionId,
            },
          }),
        },
      })
    } catch (error) {
      console.error('Error al crear usuario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear usuario',
        error: error.message,
      })
    }
  }

  /**
   * Listar todos los usuarios del sistema
   * GET /admin/usuarios
   */
  async listarUsuarios({ request, response }: HttpContext) {
    try {
      const { rol, institucionId, activo, page = 1, limit = 100 } = request.qs()

      let query = Usuario.query()
        .preload('rol')
        .orderBy('creado_en', 'desc')

      // Filtros opcionales
      if (rol) {
        query = query.where('rol_id', rol)
      }

      if (activo !== undefined) {
        query = query.where('esta_activo', activo === 'true' || activo === true)
      }

      // Si se filtra por institución, hacer join con funcionarios
      if (institucionId) {
        query = query
          .whereHas('funcionario', (funcionarioQuery) => {
            funcionarioQuery.where('institucion_id', institucionId)
          })
      }

      // Paginación
      const usuarios = await query.paginate(page, limit)

      // Cargar datos adicionales (funcionario si existe)
      const usuariosConDatos = await Promise.all(
        usuarios.all().map(async (usuario) => {
          const funcionario = await Funcionario.query()
            .where('usuario_id', usuario.id)
            .preload('institucion')
            .first()

          return {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            rol: usuario.rol.nombre,
            estaActivo: usuario.estaActivo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
            creadoEn: usuario.creadoEn,
            ...(funcionario && {
              nombre: funcionario.nombre,
              apellido: funcionario.apellido,
              telefono: funcionario.telefono,
              institucionId: funcionario.institucionId,
              institucion: funcionario.institucion?.nombre,
            }),
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: usuariosConDatos,
        meta: {
          total: usuarios.total,
          perPage: usuarios.perPage,
          currentPage: usuarios.currentPage,
          lastPage: usuarios.lastPage,
        },
      })
    } catch (error) {
      console.error('Error al listar usuarios:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: error.message,
      })
    }
  }

  /**
   * Obtener estadísticas globales del sistema
   * GET /admin/estadisticas
   */
  async estadisticasGlobales({ response }: HttpContext) {
    try {
      // Contar instituciones
      const totalInstituciones = await Institucion.query().count('* as total')

      // Contar usuarios por rol
      const usuariosPorRol = await Usuario.query()
        .select('rol_id')
        .count('* as total')
        .groupBy('rol_id')

      // Contar usuarios activos vs inactivos
      const usuariosActivos = await Usuario.query()
        .where('esta_activo', true)
        .count('* as total')
      
      const usuariosInactivos = await Usuario.query()
        .where('esta_activo', false)
        .count('* as total')

      // Mapear roles
      const rolesMap: { [key: number]: string } = {
        1: 'admin_sistema',
        2: 'rector',
        3: 'coordinador',
        4: 'orientador',
        5: 'docente',
        6: 'acudiente',
      }

      const usuariosPorRolFormateado = usuariosPorRol.map((item: any) => ({
        rolId: item.rol_id,
        rol: rolesMap[item.rol_id] || 'desconocido',
        total: Number(item.$extras.total),
      }))

      return response.status(200).json({
        success: true,
        data: {
          instituciones: {
            total: Number(totalInstituciones[0].$extras.total),
          },
          usuarios: {
            porRol: usuariosPorRolFormateado,
            activos: Number(usuariosActivos[0].$extras.total),
            inactivos: Number(usuariosInactivos[0].$extras.total),
            total: Number(usuariosActivos[0].$extras.total) + Number(usuariosInactivos[0].$extras.total),
          },
        },
      })
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  /**
   * Activar un usuario
   * PUT /admin/usuarios/:id/activar
   */
  async activarUsuario({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.find(params.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      usuario.estaActivo = true
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Usuario activado exitosamente',
        data: {
          id: usuario.id,
          correo: usuario.correo,
          estaActivo: usuario.estaActivo,
        },
      })
    } catch (error) {
      console.error('Error al activar usuario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al activar usuario',
        error: error.message,
      })
    }
  }

  /**
   * Desactivar un usuario
   * PUT /admin/usuarios/:id/desactivar
   */
  async desactivarUsuario({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.find(params.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Validar que no sea el admin principal
      if (usuario.rolId === 1 && usuario.correo === 'admin@educacionpopayan.gov.co') {
        return response.status(403).json({
          success: false,
          message: 'No se puede desactivar el usuario administrador principal',
        })
      }

      usuario.estaActivo = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Usuario desactivado exitosamente',
        data: {
          id: usuario.id,
          correo: usuario.correo,
          estaActivo: usuario.estaActivo,
        },
      })
    } catch (error) {
      console.error('Error al desactivar usuario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al desactivar usuario',
        error: error.message,
      })
    }
  }

  /**
   * Eliminar permanentemente un usuario (hard delete)
   * DELETE /admin/usuarios/:id
   */
  async eliminarUsuario({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.find(params.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Validar que no sea el admin principal
      if (usuario.rolId === 1 && usuario.correo === 'admin@educacionpopayan.gov.co') {
        return response.status(403).json({
          success: false,
          message: 'No se puede eliminar el usuario administrador principal',
        })
      }

      const usuarioId = usuario.id
      const usuarioCorreo = usuario.correo

      // Eliminar funcionario asociado si existe
      await Funcionario.query().where('usuario_id', usuarioId).delete()

      // Eliminar el usuario permanentemente
      await usuario.delete()

      return response.status(200).json({
        success: true,
        message: 'Usuario eliminado permanentemente',
        data: {
          id: usuarioId,
          correo: usuarioCorreo,
        },
      })
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      
      // Manejar error de restricción de clave foránea
      if (error.code === '23503') {
        return response.status(409).json({
          success: false,
          message: 'No se puede eliminar el usuario porque tiene registros asociados. Considere desactivarlo en su lugar.',
          error: 'FOREIGN_KEY_CONSTRAINT',
        })
      }

      return response.status(500).json({
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message,
      })
    }
  }
}
