import type { HttpContext } from '@adonisjs/core/http'
import Grado from '#models/grado'

export default class GradoController {
  async index({ response }: HttpContext) {
    const grados = await Grado.query().orderBy('id', 'desc')
    return response.ok(grados)
  }

  async show({ params, response }: HttpContext) {
    const grado = await Grado.find(params.id)
    if (!grado) {
      return response.notFound({ message: 'Grado no encontrado' })
    }

    return response.ok(grado)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'orden'])
    const grado = await Grado.create(payload)
    return response.created(grado)
  }

  async update({ params, request, response }: HttpContext) {
    const grado = await Grado.find(params.id)
    if (!grado) {
      return response.notFound({ message: 'Grado no encontrado' })
    }

    const payload = request.only(['nombre', 'orden'])
    grado.merge(payload)
    await grado.save()

    return response.ok(grado)
  }

  async destroy({ params, response }: HttpContext) {
    const grado = await Grado.find(params.id)
    if (!grado) {
      return response.notFound({ message: 'Grado no encontrado' })
    }

    await grado.delete()
    return response.ok({ message: 'Grado eliminado' })
  }
}
