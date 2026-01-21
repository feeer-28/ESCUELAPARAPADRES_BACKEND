import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'

export default class RolesController {
  async index({ response }: HttpContext) {
    const roles = await Role.query().orderBy('id', 'desc')
    return response.ok(roles)
  }

  async show({ params, response }: HttpContext) {
    const role = await Role.find(params.id)
    if (!role) {
      return response.notFound({ message: 'Rol no encontrado' })
    }

    return response.ok(role)
  }

  async store({ request, response }: HttpContext) {
    const payload = request.only(['nombre', 'estaActivo'])
    const role = await Role.create(payload)
    return response.created(role)
  }

  async update({ params, request, response }: HttpContext) {
    const role = await Role.find(params.id)
    if (!role) {
      return response.notFound({ message: 'Rol no encontrado' })
    }

    const payload = request.only(['nombre', 'estaActivo'])
    role.merge(payload)
    await role.save()

    return response.ok(role)
  }

  async destroy({ params, response }: HttpContext) {
    const role = await Role.find(params.id)
    if (!role) {
      return response.notFound({ message: 'Rol no encontrado' })
    }

    await role.delete()
    return response.ok({ message: 'Rol eliminado' })
  }
}
