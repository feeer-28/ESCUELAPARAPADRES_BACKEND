import type { HttpContext } from '@adonisjs/core/http'
import NivelEducativo from '#models/nivelEducativo'
import Institucion from '#models/institucion'

export default class NivelEducativoController {
  /**
   * Obtener niveles educativos disponibles (predeterminados + de la institución)
   * GET /niveles-educativos?institucionId=1
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      const usuario = auth.user
      const institucionId = request.qs().institucionId

      // Niveles predeterminados del sistema
      const nivelesPredeterminados = [
        { id: 0, nombre: "Preescolar", descripcion: "Transición y jardín", abreviatura: "PRE", orden: 1, esPredeterminado: true },
        { id: 0, nombre: "Primaria", descripcion: "Básica Primaria (1°-5°)", abreviatura: "PRI", orden: 2, esPredeterminado: true },
        { id: 0, nombre: "Secundaria", descripcion: "Básica Secundaria (6°-9°)", abreviatura: "SEC", orden: 3, esPredeterminado: true },
        { id: 0, nombre: "Media Técnica", descripcion: "Educación Media (10°-11°)", abreviatura: "MED", orden: 4, esPredeterminado: true }
      ]

      let nivelesPersonalizados: NivelEducativo[] = []

      // Si hay institucionId, obtener niveles personalizados
      if (institucionId) {
        // Verificar permiso si no es admin
        if (usuario && usuario.rolId !== 1) { // 1 = Admin Sistema
          const institucion = await Institucion.find(institucionId)
          if (!institucion) {
            return response.status(404).json({
              success: false,
              error: 'Institución no encontrada'
            })
          }
        }

        nivelesPersonalizados = await NivelEducativo.query()
          .where('institucion_id', institucionId)
          .whereNull('eliminado_en')
          .orderBy('orden')
      }

      return response.status(200).json({
        success: true,
        data: {
          predeterminados: nivelesPredeterminados,
          personalizados: nivelesPersonalizados.map(n => ({
            id: n.id,
            nombre: n.nombre,
            descripcion: n.descripcion,
            abreviatura: n.abreviatura,
            orden: n.orden,
            esPredeterminado: false,
            institucionId: n.institucionId
          }))
        }
      })
    } catch (error) {
      console.error('Error al obtener niveles educativos:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al obtener niveles educativos',
        details: error.message
      })
    }
  }

  /**
   * Crear un nivel educativo personalizado para una institución
   * POST /niveles-educativos
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      const usuario = auth.user
      if (!usuario) {
        return response.status(401).json({
          success: false,
          error: 'No autenticado'
        })
      }

      const payload = request.only([
        'nombre',
        'descripcion',
        'abreviatura',
        'orden',
        'institucionId'
      ])

      // Validaciones
      if (!payload.nombre?.trim()) {
        return response.status(400).json({
          success: false,
          error: 'El nombre del nivel educativo es requerido'
        })
      }

      if (!payload.institucionId) {
        return response.status(400).json({
          success: false,
          error: 'El institucionId es requerido'
        })
      }

      // Verificar que la institución exista
      const institucion = await Institucion.find(payload.institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          error: 'Institución no encontrada'
        })
      }

      // Verificar que no exista un nivel con el mismo nombre en esa institución
      const existente = await NivelEducativo.query()
        .where('institucion_id', payload.institucionId)
        .where('nombre', payload.nombre.trim())
        .whereNull('eliminado_en')
        .first()

      if (existente) {
        return response.status(409).json({
          success: false,
          error: 'Ya existe un nivel educativo con ese nombre en esta institución'
        })
      }

      // Asignar orden automático si no se proporciona
      if (!payload.orden) {
        const ultimoNivel = await NivelEducativo.query()
          .where('institucion_id', payload.institucionId)
          .whereNull('eliminado_en')
          .orderBy('orden', 'desc')
          .first()

        payload.orden = ultimoNivel ? ultimoNivel.orden + 1 : 1
      }

      // Crear nivel educativo
      const nivelEducativo = await NivelEducativo.create({
        nombre: payload.nombre.trim(),
        descripcion: payload.descripcion?.trim() || null,
        abreviatura: payload.abreviatura?.trim().toUpperCase() || null,
        orden: payload.orden,
        institucionId: payload.institucionId,
        esPredeterminado: false
      })

      return response.status(201).json({
        success: true,
        message: 'Nivel educativo creado exitosamente',
        data: {
          id: nivelEducativo.id,
          nombre: nivelEducativo.nombre,
          descripcion: nivelEducativo.descripcion,
          abreviatura: nivelEducativo.abreviatura,
          orden: nivelEducativo.orden,
          institucionId: nivelEducativo.institucionId,
          esPredeterminado: false
        }
      })
    } catch (error) {
      console.error('Error al crear nivel educativo:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al crear nivel educativo',
        details: error.message
      })
    }
  }

  /**
   * Actualizar un nivel educativo
   * PUT /niveles-educativos/:id
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const nivelEducativo = await NivelEducativo.find(params.id)
      if (!nivelEducativo) {
        return response.status(404).json({
          success: false,
          error: 'Nivel educativo no encontrado'
        })
      }

      const payload = request.only([
        'nombre',
        'descripcion',
        'abreviatura',
        'orden'
      ])

      // Validar nombre único si se está actualizando
      if (payload.nombre && payload.nombre.trim() !== nivelEducativo.nombre) {
        const existente = await NivelEducativo.query()
          .where('institucion_id', nivelEducativo.institucionId)
          .where('nombre', payload.nombre.trim())
          .whereNot('id', nivelEducativo.id)
          .whereNull('eliminado_en')
          .first()

        if (existente) {
          return response.status(409).json({
            success: false,
            error: 'Ya existe un nivel educativo con ese nombre en esta institución'
          })
        }
      }

      // Actualizar campos
      if (payload.nombre) nivelEducativo.nombre = payload.nombre.trim()
      if (payload.descripcion !== undefined) nivelEducativo.descripcion = payload.descripcion?.trim() || null
      if (payload.abreviatura !== undefined) nivelEducativo.abreviatura = payload.abreviatura?.trim().toUpperCase() || null
      if (payload.orden !== undefined) nivelEducativo.orden = payload.orden

      await nivelEducativo.save()

      return response.status(200).json({
        success: true,
        message: 'Nivel educativo actualizado exitosamente',
        data: {
          id: nivelEducativo.id,
          nombre: nivelEducativo.nombre,
          descripcion: nivelEducativo.descripcion,
          abreviatura: nivelEducativo.abreviatura,
          orden: nivelEducativo.orden,
          institucionId: nivelEducativo.institucionId
        }
      })
    } catch (error) {
      console.error('Error al actualizar nivel educativo:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al actualizar nivel educativo',
        details: error.message
      })
    }
  }

  /**
   * Eliminar un nivel educativo (soft delete)
   * DELETE /niveles-educativos/:id
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const nivelEducativo = await NivelEducativo.find(params.id)
      if (!nivelEducativo) {
        return response.status(404).json({
          success: false,
          error: 'Nivel educativo no encontrado'
        })
      }

      // Soft delete
      nivelEducativo.eliminadoEn = new Date()
      await nivelEducativo.save()

      return response.status(200).json({
        success: true,
        message: 'Nivel educativo eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar nivel educativo:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al eliminar nivel educativo',
        details: error.message
      })
    }
  }
}
