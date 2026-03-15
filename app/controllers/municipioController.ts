import type { HttpContext } from '@adonisjs/core/http'
import Municipio from '#models/municipio'

export default class MunicipioController {
  async index({ response }: HttpContext) {
    const municipios = await Municipio.query().orderBy('id', 'desc')
    return response.ok(municipios)
  }

  async show({ params, response }: HttpContext) {
    const municipio = await Municipio.find(params.id)
    if (!municipio) {
      return response.notFound({ message: 'Municipio no encontrado' })
    }

    return response.ok(municipio)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'departamentoId', 'codigo'])
    const municipio = await Municipio.create(payload)
    return response.created(municipio)
  }

  async update({ params, request, response }: HttpContext) {
    const municipio = await Municipio.find(params.id)
    if (!municipio) {
      return response.notFound({ message: 'Municipio no encontrado' })
    }

    const payload = request.only(['nombre', 'departamentoId', 'codigo'])
    municipio.merge(payload)
    await municipio.save()

    return response.ok(municipio)
  }

  async destroy({ params, response }: HttpContext) {
    const municipio = await Municipio.find(params.id)
    if (!municipio) {
      return response.notFound({ message: 'Municipio no encontrado' })
    }

    await municipio.delete()
    return response.ok({ message: 'Municipio eliminado' })
  }
}