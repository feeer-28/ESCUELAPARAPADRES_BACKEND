import type { HttpContext } from '@adonisjs/core/http'
import Funcionario from '#models/funcionario'
import Curso from '#models/curso'
import Estudiante from '#models/estudiante'
import Usuario from '#models/usuario'
import Institucion from '#models/institucion'

export default class RectoresController {
  /**
   * Obtener estadísticas del rector
   * GET /rectores/estadisticas
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe y es rector
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 2) {
        return response.status(403).json({
          success: false,
          message: 'Solo los rectores pueden acceder a estas estadísticas',
        })
      }

      // Obtener el funcionario con su institución
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .firstOrFail()

      const institucionId = rector.institucionId

      // Contar coordinadores (rolId: 3)
      const coordinadores = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 3)
        })

      const coordinadoresActivos = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 3).where('esta_activo', true)
        })

      // Contar orientadores (rolId: 4)
      const orientadores = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 4)
        })

      const orientadoresActivos = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 4).where('esta_activo', true)
        })

      // Contar docentes (rolId: 5)
      const docentes = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 5)
        })

      const docentesActivos = await Funcionario.query()
        .where('institucion_id', institucionId)
        .whereHas('usuario', (query) => {
          query.where('rol_id', 5).where('esta_activo', true)
        })

      // Contar cursos de la institución
      const cursos = await Curso.query().where('institucion_id', institucionId)

      // Contar estudiantes de todos los cursos de la institución
      let totalEstudiantes = 0
      for (const curso of cursos) {
        const count = await Estudiante.query()
          .whereHas('asignacionCurso', (query) => {
            query.where('curso_id', curso.id)
          })
          .getCount()
        totalEstudiantes += count
      }

      return response.status(200).json({
        success: true,
        data: {
          institucionId,
          institucionNombre: rector.institucion?.nombre,
          totalCoordinadores: coordinadores.length,
          coordinadoresActivos: coordinadoresActivos.length,
          totalOrientadores: orientadores.length,
          orientadoresActivos: orientadoresActivos.length,
          totalDocentes: docentes.length,
          docentesActivos: docentesActivos.length,
          totalCursos: cursos.length,
          totalEstudiantes,
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
   * Crear un coordinador en la institución del rector
   * POST /rectores/coordinadores
   */
  async crearCoordinador({ request, response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe y es rector
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 2) {
        return response.status(403).json({
          success: false,
          message: 'Solo los rectores pueden crear coordinadores en su institución',
        })
      }

      // Obtener la institución del rector
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .firstOrFail()

      const institucionId = rector.institucionId

      // Validar que la institución existe y está activa
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      const { correo, contrasena, nombre, apellido, telefono } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido) {
        return response.status(400).json({
          success: false,
          message: 'Los campos correo, contraseña, nombre y apellido son requeridos',
          errors: {
            required: ['correo', 'contrasena', 'nombre', 'apellido'],
          },
        })
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(correo)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del correo es inválido',
        })
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado en el sistema',
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

      // Crear funcionario (coordinador) en la institución del rector
      const coordinador = await Funcionario.create({
        nombre,
        apellido,
        telefono: telefono || null,
        institucionId, // Institución del rector (no se puede cambiar)
        usuarioId: usuario.id,
        rolId: 3,
      })

      return response.status(201).json({
        success: true,
        message: `Coordinador creado exitosamente en ${institucion.nombre}`,
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          coordinador: {
            id: coordinador.id,
            nombre: coordinador.nombre,
            apellido: coordinador.apellido,
            telefono: coordinador.telefono,
            institucionId: coordinador.institucionId,
            institucionNombre: institucion.nombre,
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
}
