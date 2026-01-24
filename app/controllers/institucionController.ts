import type { HttpContext } from '@adonisjs/core/http'
import Institucion from '#models/institucion'
import Funcionario from '#models/funcionario'

export default class InstitucionController {
  /**
   * Listar todas las instituciones
   * GET /instituciones
   */
  async index({ response }: HttpContext) {
    try {
      const instituciones = await Institucion.query()
        .preload('municipio', (municipioQuery) => {
          municipioQuery.preload('departamento')
        })
        .orderBy('id', 'desc')

      const institucionesFormateadas = instituciones.map((inst) => ({
        id: inst.id,
        nombre: inst.nombre,
        telefono: inst.telefono,
        correo: inst.correo,
        direccion: inst.direccion,
        naturaleza: inst.naturaleza,
        codigoDane: inst.codigoDane,
        nit: inst.nit,
        activo: true,
        municipioId: inst.municipioId,
        municipio: inst.municipio && {
          id: inst.municipio.id,
          nombre: inst.municipio.nombre,
          departamento: inst.municipio.departamento && {
            id: inst.municipio.departamento.id,
            nombre: inst.municipio.departamento.nombre,
          },
        },
      }))

      return response.status(200).json({
        success: true,
        data: institucionesFormateadas,
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
   * Obtener una institución específica con detalles completos
   * GET /instituciones/:id
   */
  async show({ params, response }: HttpContext) {
    try {
      const institucion = await Institucion.query()
        .where('id', params.id)
        .preload('municipio', (municipioQuery) => {
          municipioQuery.preload('departamento')
        })
        .firstOrFail()

      return response.status(200).json({
        success: true,
        data: {
          id: institucion.id,
          nombre: institucion.nombre,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          naturaleza: institucion.naturaleza,
          codigoDane: institucion.codigoDane,
          nit: institucion.nit,
          activo: true,
          municipioId: institucion.municipioId,
          municipio: institucion.municipio && {
            id: institucion.municipio.id,
            nombre: institucion.municipio.nombre,
            departamento: institucion.municipio.departamento && {
              id: institucion.municipio.departamento.id,
              nombre: institucion.municipio.departamento.nombre,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error al obtener institución:', error)
      return response.status(404).json({
        success: false,
        message: 'Institución no encontrada',
      })
    }
  }

  /**
   * Obtener directivos de una institución (coordinadores y orientadores)
   * GET /instituciones/:id/directivos
   */
  async directivos({ params, response }: HttpContext) {
    try {
      const institucion = await Institucion.findOrFail(params.id)

      // Obtener coordinadores (rolId: 3) y orientadores (rolId: 4)
      const funcionarios = await Funcionario.query()
        .where('institucion_id', institucion.id)
        .preload('usuario', (usuarioQuery) => {
          usuarioQuery.whereIn('rol_id', [3, 4]).where('esta_activo', true)
        })

      // Separar por rol
      const coordinadores: any[] = []
      const orientadores: any[] = []

      for (const func of funcionarios) {
        if (func.usuario) {
          const directivo = {
            id: func.id,
            nombre: func.nombre,
            apellido: func.apellido,
            telefono: func.telefono,
            correo: func.usuario.correo,
            activo: func.usuario.estaActivo,
            usuarioId: func.usuario.id,
          }

          if (func.usuario.rolId === 3) {
            coordinadores.push(directivo)
          } else if (func.usuario.rolId === 4) {
            orientadores.push(directivo)
          }
        }
      }

      return response.status(200).json({
        success: true,
        data: {
          coordinadores,
          orientadores,
        },
      })
    } catch (error) {
      console.error('Error al obtener directivos:', error)
      return response.status(404).json({
        success: false,
        message: 'Institución no encontrada',
      })
    }
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only([
      'nombre',
      'telefono',
      'correo',
      'direccion',
      'naturaleza',
      'municipioId',
    ])

    const institucion = await Institucion.create(payload)
    return response.created(institucion)
  }

  async update({ params, request, response }: HttpContext) {
    const institucion = await Institucion.find(params.id)
    if (!institucion) {
      return response.notFound({ message: 'Institucion no encontrada' })
    }

    const payload = request.only([
      'nombre',
      'telefono',
      'correo',
      'direccion',
      'naturaleza',
      'municipioId',
    ])

    institucion.merge(payload)
    await institucion.save()

    return response.ok(institucion)
  }

  async destroy({ params, response }: HttpContext) {
    const institucion = await Institucion.find(params.id)
    if (!institucion) {
      return response.notFound({ message: 'Institucion no encontrada' })
    }

    await institucion.delete()
    return response.ok({ message: 'Institucion eliminada' })
  }
}
