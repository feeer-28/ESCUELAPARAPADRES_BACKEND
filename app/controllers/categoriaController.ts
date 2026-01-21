import type { HttpContext } from '@adonisjs/core/http'
import Categoria from '#models/categoria'

export default class CategoriaController {
  async index({ response }: HttpContext) {
    const categorias = await Categoria.query().orderBy('id', 'desc')
    return response.ok(categorias)
  }

  async show({ params, response }: HttpContext) {
    const categoria = await Categoria.find(params.id)
    if (!categoria) {
      return response.notFound({ message: 'Categoria no encontrada' })
    }

    return response.ok(categoria)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'descripcion', 'color', 'icono'])
    const categoria = await Categoria.create(payload)
    return response.created(categoria)
  }

  async update({ params, request, response }: HttpContext) {
    const categoria = await Categoria.find(params.id)
    if (!categoria) {
      return response.notFound({ message: 'Categoria no encontrada' })
    }

    const payload = request.only(['nombre', 'descripcion', 'color', 'icono'])
    categoria.merge(payload)
    await categoria.save()

    return response.ok(categoria)
  }

  async destroy({ params, response }: HttpContext) {
    const categoria = await Categoria.find(params.id)
    if (!categoria) {
      return response.notFound({ message: 'Categoria no encontrada' })
    }

    await categoria.delete()
    return response.ok({ message: 'Categoria eliminada' })
  }
}