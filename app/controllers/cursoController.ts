import type { HttpContext } from '@adonisjs/core/http'
import Curso from '#models/curso'

export default class CursoController {
  async index({ response }: HttpContext) {
    const cursos = await Curso.query().orderBy('id', 'desc')
    return response.ok(cursos)
  }

  async show({ params, response }: HttpContext) {
    const curso = await Curso.find(params.id)
    if (!curso) {
      return response.notFound({ message: 'Curso no encontrado' })
    }

    return response.ok(curso)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'gradoId', 'jornada', 'institucionId'])
    const curso = await Curso.create(payload)
    return response.created(curso)
  }

  async update({ params, request, response }: HttpContext) {
    const curso = await Curso.find(params.id)
    if (!curso) {
      return response.notFound({ message: 'Curso no encontrado' })
    }

    const payload = request.only(['nombre', 'gradoId', 'jornada', 'institucionId'])
    curso.merge(payload)
    await curso.save()

    return response.ok(curso)
  }

  async destroy({ params, response }: HttpContext) {
    const curso = await Curso.find(params.id)
    if (!curso) {
      return response.notFound({ message: 'Curso no encontrado' })
    }

    await curso.delete()
    return response.ok({ message: 'Curso eliminado' })
  }
}
