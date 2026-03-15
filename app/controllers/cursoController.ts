import type { HttpContext } from '@adonisjs/core/http'
import Curso from '#models/curso'
import db from '@adonisjs/lucid/services/db'

export default class CursoController {
async index({ response }: HttpContext) {
  const cursos = await Curso
    .query()
    .withCount('estudiantes')
    .orderBy('id', 'desc')

  const cursosTransformados = cursos.map(curso => ({
    ...curso.serialize(),
    totalEstudiantes: curso.$extras.estudiantes_count
  }))

  return response.ok(cursosTransformados)
}

 async porInstitucion({ params, request, response }: HttpContext) {
  const institucionIdRaw = params.institucionId ?? request.input('institucionId') ?? request.input('institucion_id')
  const institucionId = Number(institucionIdRaw)

  if (!institucionIdRaw || Number.isNaN(institucionId)) {
    return response.badRequest({ message: 'institucionId inválido' })
  }

  const cursos = await Curso
    .query()
    .where('institucion_id', institucionId)
    .select('id', 'nombre', 'institucion_id as institucionId')
    .orderBy('nombre', 'asc')

  // 🔥 Devolver formato plano como arreglo directo
  return response.ok({
    success: true,
    data: cursos.map(curso => ({
      id: curso.id,
      nombre: curso.nombre,
      institucionId: curso.institucionId
    }))
  })
}
  /**
   * Obtener cursos del docente logueado (de su institución)
   * GET /cursos/mis-cursos
   */
  async misCursos({ auth, response }: HttpContext) {
    const jwtUser = (auth as any).jwtUser || auth.user
    
    if (!jwtUser) {
      return response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    try {
      // Buscar el docente para obtener su institución
      const docente = await db.from('docentes')
        .where('usuario_id', jwtUser.id)
        .first()

      if (!docente || !docente.institucion_id) {
        return response.badRequest({
          success: false,
          message: 'El docente no tiene una institución asignada'
        })
      }

      // Obtener cursos de la institución del docente
      const cursos = await db.from('cursos as c')
        .leftJoin('grados as g', 'c.grado_id', 'g.id')
        .select(
          'c.id',
          'c.nombre',
          'c.institucion_id as institucionId',
          'c.grado_id as gradoId',
          'g.nombre as grado_nombre',
          'c.jornada'
        )
        .where('c.institucion_id', docente.institucion_id)
        .orderBy('g.nombre', 'asc')
        .orderBy('c.nombre', 'asc')

      console.log('📚 Cursos encontrados para docente:', cursos.length)
      console.log('🏫 Institución del docente:', docente.institucion_id)

      return response.ok({
        success: true,
        data: cursos,
        institucionId: docente.institucion_id,
        totalCursos: cursos.length
      })

    } catch (error) {
      console.error('❌ Error al obtener cursos del docente:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al obtener cursos',
        error: error.message
      })
    }
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
