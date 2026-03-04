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
    try {
      const payload = request.only([
        'nombre',
        'telefono',
        'correo',
        'direccion',
        'naturaleza',
        'municipioId',
        'codigoDane',
        'nit',
        'resolucionAprobacion',
        'nivelesEducativos',
        'modalidad',
        'jornadas',
        'telefonoPrincipal',
        'telefonoSecretaria',
        'correoInstitucional',
        'correoRectoria',
        'sitioWeb',
        'direccionCompleta',
        'barrio',
        'estrato',
        'coordenadasGps',
        'capacidadEstudiantes',
        'anoFundacion',
        'enfoquePedagogico',
        'confesional',
        'religion',
        'rectorNombre',
        'rectorDocumento',
        'rectorTelefono',
        'rectorCorreo',
      ])

      // Validar campos requeridos
      if (!payload.nombre) {
        return response.status(400).json({
          success: false,
          error: 'El nombre de la institución es requerido',
        })
      }

      if (!payload.naturaleza) {
        return response.status(400).json({
          success: false,
          error: 'La naturaleza de la institución es requerida',
        })
      }

      if (!payload.municipioId) {
        return response.status(400).json({
          success: false,
          error: 'El municipio es requerido',
        })
      }

      // Validar que naturaleza sea válida
      if (!['publica', 'privada'].includes(payload.naturaleza?.toLowerCase())) {
        return response.status(400).json({
          success: false,
          error: 'La naturaleza debe ser "publica" o "privada"',
        })
      }

      // Normalizar naturaleza
      payload.naturaleza = payload.naturaleza.toLowerCase()

      // Validar código DANE único (si se proporciona)
      if (payload.codigoDane) {
        const existente = await Institucion.query()
          .where('codigo_dane', payload.codigoDane)
          .first()
        
        if (existente) {
          return response.status(409).json({
            success: false,
            error: 'Ya existe una institución con este código DANE',
          })
        }
      }

      // Validar NIT único (si se proporciona)
      if (payload.nit) {
        const existente = await Institucion.query()
          .where('nit', payload.nit)
          .first()
        
        if (existente) {
          return response.status(409).json({
            success: false,
            error: 'Ya existe una institución con este NIT',
          })
        }
      }

      // Crear institución
      const institucion = await Institucion.create(payload)

      // Cargar relaciones para la respuesta
      await institucion.load('municipio', (municipioQuery) => {
        municipioQuery.preload('departamento')
      })

      return response.status(201).json({
        success: true,
        message: 'Institución creada exitosamente',
        institucion: {
          id: institucion.id,
          nombre: institucion.nombre,
          codigoDane: institucion.codigoDane,
          nit: institucion.nit,
          naturaleza: institucion.naturaleza,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          telefonoPrincipal: institucion.telefonoPrincipal,
          correoInstitucional: institucion.correoInstitucional,
          direccionCompleta: institucion.direccionCompleta,
          rectorNombre: institucion.rectorNombre,
          rectorDocumento: institucion.rectorDocumento,
          rectorTelefono: institucion.rectorTelefono,
          municipioId: institucion.municipioId,
          municipio: institucion.municipio && {
            id: institucion.municipio.id,
            nombre: institucion.municipio.nombre,
            departamento: institucion.municipio.departamento && {
              id: institucion.municipio.departamento.id,
              nombre: institucion.municipio.departamento.nombre,
            },
          },
          creadoEn: institucion.creadoEn,
        },
      })
    } catch (error) {
      console.error('Error al crear institución:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al crear la institución',
        details: error.message,
      })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const institucion = await Institucion.find(params.id)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          error: 'Institución no encontrada',
        })
      }

      const payload = request.only([
        'nombre',
        'telefono',
        'correo',
        'direccion',
        'naturaleza',
        'municipioId',
        'codigoDane',
        'nit',
        'resolucionAprobacion',
        'nivelesEducativos',
        'modalidad',
        'jornadas',
        'telefonoPrincipal',
        'telefonoSecretaria',
        'correoInstitucional',
        'correoRectoria',
        'sitioWeb',
        'direccionCompleta',
        'barrio',
        'estrato',
        'coordenadasGps',
        'capacidadEstudiantes',
        'anoFundacion',
        'enfoquePedagogico',
        'confesional',
        'religion',
        'rectorNombre',
        'rectorDocumento',
        'rectorTelefono',
        'rectorCorreo',
      ])

      // Validar naturaleza si se proporciona
      if (payload.naturaleza && !['publica', 'privada'].includes(payload.naturaleza?.toLowerCase())) {
        return response.status(400).json({
          success: false,
          error: 'La naturaleza debe ser "publica" o "privada"',
        })
      }

      // Normalizar naturaleza
      if (payload.naturaleza) {
        payload.naturaleza = payload.naturaleza.toLowerCase()
      }

      // Validar código DANE único (si se cambia)
      if (payload.codigoDane && payload.codigoDane !== institucion.codigoDane) {
        const existente = await Institucion.query()
          .where('codigo_dane', payload.codigoDane)
          .whereNot('id', institucion.id)
          .first()
        
        if (existente) {
          return response.status(409).json({
            success: false,
            error: 'Ya existe una institución con este código DANE',
          })
        }
      }

      // Validar NIT único (si se cambia)
      if (payload.nit && payload.nit !== institucion.nit) {
        const existente = await Institucion.query()
          .where('nit', payload.nit)
          .whereNot('id', institucion.id)
          .first()
        
        if (existente) {
          return response.status(409).json({
            success: false,
            error: 'Ya existe una institución con este NIT',
          })
        }
      }

      institucion.merge(payload)
      await institucion.save()

      // Cargar relaciones para la respuesta
      await institucion.load('municipio', (municipioQuery) => {
        municipioQuery.preload('departamento')
      })

      return response.status(200).json({
        success: true,
        message: 'Institución actualizada exitosamente',
        institucion: {
          id: institucion.id,
          nombre: institucion.nombre,
          codigoDane: institucion.codigoDane,
          nit: institucion.nit,
          naturaleza: institucion.naturaleza,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          telefonoPrincipal: institucion.telefonoPrincipal,
          correoInstitucional: institucion.correoInstitucional,
          direccionCompleta: institucion.direccionCompleta,
          rectorNombre: institucion.rectorNombre,
          rectorDocumento: institucion.rectorDocumento,
          rectorTelefono: institucion.rectorTelefono,
          municipioId: institucion.municipioId,
          municipio: institucion.municipio && {
            id: institucion.municipio.id,
            nombre: institucion.municipio.nombre,
            departamento: institucion.municipio.departamento && {
              id: institucion.municipio.departamento.id,
              nombre: institucion.municipio.departamento.nombre,
            },
          },
          actualizadoEn: institucion.actualizadoEn,
        },
      })
    } catch (error) {
      console.error('Error al actualizar institución:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al actualizar la institución',
        details: error.message,
      })
    }
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
