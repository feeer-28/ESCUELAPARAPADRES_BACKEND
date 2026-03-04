import type { HttpContext } from '@adonisjs/core/http'
import Departamento from '#models/departamento'

export default class DepartamentoController {
  async index({ response }: HttpContext) {
    const departamentos = await Departamento.query().orderBy('id', 'desc')
    return response.ok(departamentos)
  }

  async show({ params, response }: HttpContext) {
    const departamento = await Departamento.find(params.id)
    if (!departamento) {
      return response.notFound({ message: 'Departamento no encontrado' })
    }

    return response.ok(departamento)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'codigo'])
    const departamento = await Departamento.create(payload)
    return response.created(departamento)
  }

  async update({ params, request, response }: HttpContext) {
    const departamento = await Departamento.find(params.id)
    if (!departamento) {
      return response.notFound({ message: 'Departamento no encontrado' })
    }

    const payload = request.only(['nombre', 'codigo'])
    departamento.merge(payload)
    await departamento.save()

    return response.ok(departamento)
  }

  async destroy({ params, response }: HttpContext) {
    const departamento = await Departamento.find(params.id)
    if (!departamento) {
      return response.notFound({ message: 'Departamento no encontrado' })
    }

    await departamento.delete()
    return response.ok({ message: 'Departamento eliminado' })
  }
}