import type { HttpContext } from '@adonisjs/core/http'
import Usuario from '#models/usuario'
import Funcionario from '#models/funcionario'
import hash from '@adonisjs/core/services/hash'

export default class UsuariosController {
  /**
   * Listar todos los usuarios
   * GET /usuarios
   */
  async index({ request, response }: HttpContext) {
    try {
      const { rol, institucionId, activo, page = 1, limit = 100 } = request.qs()

      // Construir query
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
            // Datos del funcionario si existe
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
   * Obtener un usuario específico
   * GET /usuarios/:id
   */
  async show({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.query()
        .where('id', params.id)
        .preload('rol')
        .firstOrFail()

      const funcionario = await Funcionario.query()
        .where('usuario_id', usuario.id)
        .preload('institucion')
        .first()

      return response.status(200).json({
        success: true,
        data: {
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
        },
      })
    } catch (error) {
      console.error('Error al obtener usuario:', error)
      return response.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      })
    }
  }

  /**
   * Actualizar un usuario
   * PUT /usuarios/:id
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const { nombre, apellido, telefono, estaActivo } = request.only([
        'nombre',
        'apellido',
        'telefono',
        'estaActivo',
      ])

      const usuario = await Usuario.findOrFail(params.id)

      // Actualizar estado de usuario si viene en el request
      if (estaActivo !== undefined) {
        usuario.estaActivo = estaActivo
        await usuario.save()
      }

      // Actualizar datos de funcionario si existen
      const funcionario = await Funcionario.query()
        .where('usuario_id', usuario.id)
        .first()

      if (funcionario) {
        if (nombre) funcionario.nombre = nombre
        if (apellido) funcionario.apellido = apellido
        if (telefono) funcionario.telefono = telefono
        await funcionario.save()
      }

      // Recargar usuario con relaciones
      await usuario.load('rol')
      await funcionario?.load('institucion')

      return response.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: {
          id: usuario.id,
          correo: usuario.correo,
          rolId: usuario.rolId,
          rol: usuario.rol.nombre,
          estaActivo: usuario.estaActivo,
          ...(funcionario && {
            nombre: funcionario.nombre,
            apellido: funcionario.apellido,
            telefono: funcionario.telefono,
            institucionId: funcionario.institucionId,
            institucion: funcionario.institucion?.nombre,
          }),
        },
      })
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message,
      })
    }
  }

  /**
   * Desactivar/eliminar un usuario
   * DELETE /usuarios/:id
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.findOrFail(params.id)

      // Validar que no sea el admin principal
      if (usuario.rolId === 1 && usuario.correo === 'admin@educacionpopayan.gov.co') {
        return response.status(403).json({
          success: false,
          message: 'No se puede desactivar el usuario administrador principal',
        })
      }

      // Soft delete: marcar como inactivo en lugar de eliminar
      usuario.estaActivo = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Usuario desactivado exitosamente',
        data: {
          id: usuario.id,
          estaActivo: usuario.estaActivo,
        },
      })
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al desactivar usuario',
        error: error.message,
      })
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   * GET /usuarios/me
   */
  async me({ response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      const usuario = await Usuario.query()
        .where('id', jwtUser.id)
        .preload('rol')
        .firstOrFail()

      const funcionario = await Funcionario.query()
        .where('usuario_id', usuario.id)
        .preload('institucion', (institucionQuery) => {
          institucionQuery.preload('municipio', (municipioQuery) => {
            municipioQuery.preload('departamento')
          })
        })
        .first()

      return response.status(200).json({
        success: true,
        data: {
          id: usuario.id,
          correo: usuario.correo,
          rolId: usuario.rolId,
          estaActivo: usuario.estaActivo,
          debeCambiarContrasena: usuario.debeCambiarContrasena,
          ...(funcionario && {
            nombre: funcionario.nombre,
            apellido: funcionario.apellido,
            telefono: funcionario.telefono,
            documento: funcionario.numeroDocumento,
            tipoDocumento: funcionario.tipoDocumento,
            institucionId: funcionario.institucionId,
            institucion: funcionario.institucion && {
              id: funcionario.institucion.id,
              nombre: funcionario.institucion.nombre,
              direccion: funcionario.institucion.direccion,
              telefono: funcionario.institucion.telefono,
              correo: funcionario.institucion.correo,
              naturaleza: funcionario.institucion.naturaleza,
              codigoDane: funcionario.institucion.codigoDane,
              nit: funcionario.institucion.nit,
              municipio: funcionario.institucion.municipio && {
                id: funcionario.institucion.municipio.id,
                nombre: funcionario.institucion.municipio.nombre,
                departamento: funcionario.institucion.municipio.departamento && {
                  id: funcionario.institucion.municipio.departamento.id,
                  nombre: funcionario.institucion.municipio.departamento.nombre,
                },
              },
            },
          }),
        },
      })
    } catch (error) {
      console.error('Error al obtener perfil:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener perfil del usuario',
        error: error.message,
      })
    }
  }

  /**
   * Cambiar contraseña del usuario autenticado
   * POST /usuarios/cambiar-password
   */
  async cambiarPassword({ request, response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      const { contrasenaActual, contrasenaNueva, confirmarContrasena } = request.only([
        'contrasenaActual',
        'contrasenaNueva',
        'confirmarContrasena',
      ])

      // Validar campos requeridos
      if (!contrasenaActual || !contrasenaNueva || !confirmarContrasena) {
        return response.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
          errors: {
            required: ['contrasenaActual', 'contrasenaNueva', 'confirmarContrasena'],
          },
        })
      }

      // Validar que las contraseñas nuevas coincidan
      if (contrasenaNueva !== confirmarContrasena) {
        return response.status(400).json({
          success: false,
          message: 'La nueva contraseña y la confirmación no coinciden',
        })
      }

      // Validar que la contraseña nueva sea diferente a la actual
      if (contrasenaActual === contrasenaNueva) {
        return response.status(400).json({
          success: false,
          message: 'La nueva contraseña debe ser diferente a la contraseña actual',
        })
      }

      // Validar formato de contraseña segura (8+ chars, 1 mayúscula, 1 número, 1 especial)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasenaNueva)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe cumplir los requisitos de seguridad',
          errors: {
            password: [
              'Mínimo 8 caracteres',
              'Al menos una letra mayúscula',
              'Al menos una letra minúscula',
              'Al menos un número',
              'Al menos un carácter especial (!@#$%^&*)',
            ],
          },
        })
      }

      // Buscar el usuario
      const usuario = await Usuario.find(jwtUser.id)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Verificar que la contraseña actual es correcta
      const isCurrentPasswordValid = await hash.verify(usuario.contrasenaHash, contrasenaActual)
      if (!isCurrentPasswordValid) {
        return response.status(401).json({
          success: false,
          message: 'La contraseña actual es incorrecta',
        })
      }

      // Actualizar la contraseña
      usuario.contrasenaHash = contrasenaNueva // El modelo se encarga del hash
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        data: {
          debeCambiarContrasena: false,
        },
      })
    } catch (error) {
      console.error('Error al cambiar contraseña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al cambiar la contraseña',
        error: error.message,
      })
    }
  }
}
