import type { HttpContext } from '@adonisjs/core/http'

import Acudiente from '#models/acudiente'
import Curso from '#models/curso'
import Estudiante from '#models/estudiante'

export default class EstudianteController {
  async index({ response }: HttpContext) {
    const estudiantes = await Estudiante.query().orderBy('id', 'desc')
    return response.ok(estudiantes)
  }

  async show({ params, response }: HttpContext) {
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
    }

    return response.ok(estudiante)
  }

  async store({ request, response }: HttpContext) {
    const cursoId = request.input('cursoId') ?? request.input('curso_id')
    if (!cursoId) {
      return response.badRequest({ message: 'cursoId es requerido' })
    }

    const curso = await Curso.find(cursoId)
    if (!curso) {
      return response.badRequest({ message: 'El cursoId no existe' })
    }

    const payload = request.only([
      'nombres',
      'apellidos',
      'tipoDocumento',
      'numeroDocumento',
      'fechaNacimiento',
      'sexo',
      'grupoSanguineo',
      'rh',
      'paisNacimiento',
      'ciudadNacimiento',
      'estrato',
      'etnia',
      'eps',
      'cursoId',
    ])

    payload.cursoId = Number(cursoId)

    const numeroDocumento = String(payload.numeroDocumento ?? '').trim()
    if (numeroDocumento) {
      const existente = await Estudiante.query().where('numero_documento', numeroDocumento).first()
      if (existente) {
        return response.conflict({ message: 'Este usuario ya existe: el numero de documento ya está registrado' })
      }
    }

    const estudiante = await Estudiante.create(payload)

    const acudienteId = request.input('acudienteId') ?? request.input('acudiente_id')
    const acudienteIds = request.input('acudienteIds') ?? request.input('acudiente_ids')

    const relacion = String(request.input('relacion') ?? 'acudiente')
    const esPrincipal = Boolean(request.input('esPrincipal') ?? request.input('es_principal') ?? true)

    const ids: number[] = Array.isArray(acudienteIds)
      ? acudienteIds.map((id: any) => Number(id))
      : acudienteId !== undefined && acudienteId !== null
        ? [Number(acudienteId)]
        : []

    if (ids.length) {
      const acudientes = await Acudiente.query().whereIn('id', ids)
      if (acudientes.length !== ids.length) {
        return response.badRequest({ message: 'Uno o más acudienteIds no existen' })
      }

      const attachPayload: Record<number, { relacion: string; es_principal: boolean }> = {}
      ids.forEach((id, idx) => {
        attachPayload[id] = { relacion, es_principal: idx === 0 ? esPrincipal : false }
      })

      await estudiante.related('acudientes').attach(attachPayload)
    }

    return response.created(estudiante)
  }

  async update({ params, request, response }: HttpContext) {
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
    }

    const payload = request.only([
      'nombres',
      'apellidos',
      'tipoDocumento',
      'numeroDocumento',
      'fechaNacimiento',
      'sexo',
      'grupoSanguineo',
      'rh',
      'paisNacimiento',
      'ciudadNacimiento',
      'estrato',
      'etnia',
      'eps',
      'cursoId',
    ])

    estudiante.merge(payload)
    await estudiante.save()

    return response.ok(estudiante)
  }

  async destroy({ params, response }: HttpContext) {
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
    }

    await estudiante.delete()
    return response.ok({ message: 'Estudiante eliminado' })
  }
}
