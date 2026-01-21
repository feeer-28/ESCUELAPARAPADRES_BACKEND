import type { HttpContext } from '@adonisjs/core/http'
import Institucion from '#models/institucion'

export default class InstitucionController {
  async index({ response }: HttpContext) {
    const instituciones = await Institucion.query().orderBy('id', 'desc')
    return response.ok(instituciones)
  }

  async show({ params, response }: HttpContext) {
    const institucion = await Institucion.find(params.id)
    if (!institucion) {
      return response.notFound({ message: 'Institucion no encontrada' })
    }

    return response.ok(institucion)
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
