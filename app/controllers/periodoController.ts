import type { HttpContext } from '@adonisjs/core/http'
import Periodo from '#models/periodo'

export default class PeriodoController {
  async index({ response }: HttpContext) {
    const periodos = await Periodo.query().orderBy('id', 'desc')
    return response.ok(periodos)
  }

  async show({ params, response }: HttpContext) {
    const periodo = await Periodo.find(params.id)
    if (!periodo) {
      return response.notFound({ message: 'Periodo no encontrado' })
    }

    return response.ok(periodo)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'fechaInicio', 'fechaFin', 'institucionId', 'estaActivo'])
    const periodo = await Periodo.create(payload)
    return response.created(periodo)
  }

  async update({ params, request, response }: HttpContext) {
    const periodo = await Periodo.find(params.id)
    if (!periodo) {
      return response.notFound({ message: 'Periodo no encontrado' })
    }

    const payload = request.only(['nombre', 'fechaInicio', 'fechaFin', 'institucionId', 'estaActivo'])
    periodo.merge(payload)
    await periodo.save()

    return response.ok(periodo)
  }

  async destroy({ params, response }: HttpContext) {
    const periodo = await Periodo.find(params.id)
    if (!periodo) {
      return response.notFound({ message: 'Periodo no encontrado' })
    }

    await periodo.delete()
    return response.ok({ message: 'Periodo eliminado' })
  }
}
