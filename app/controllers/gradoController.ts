import type { HttpContext } from '@adonisjs/core/http'
import Grado from '#models/grado'
import db from '@adonisjs/lucid/services/db'

export default class GradoController {
  async index({ response }: HttpContext) {
    try {
      const grados = await Grado.query()
        .preload('cursos', (cursosQuery) => {
          cursosQuery
            .preload('docentes', (docentesQuery) => {
              docentesQuery.select('id', 'usuario_id')
            })
            .orderBy('nombre', 'asc')
        })
        .orderBy('orden', 'asc')

      // Obtener conteo de estudiantes por curso
      const estudiantesPorCurso = await db
        .from('estudiantes')
        .select('curso_id')
        .count('* as total')
        .groupBy('curso_id')

      const estudiantesMap = new Map(
        estudiantesPorCurso.map((item) => [item.curso_id, Number(item.total)])
      )

      // Formatear respuesta con información completa
      const gradosConInfo = await Promise.all(
        grados.map(async (grado) => {
          const cursosConInfo = await Promise.all(
            grado.cursos.map(async (curso) => {
              const totalEstudiantes = estudiantesMap.get(curso.id) || 0

              // Obtener información del docente director si existe
              let docenteDirector = null
              if (curso.docentes && curso.docentes.length > 0) {
                const docente = curso.docentes[0]
                const funcionario = await db
                  .from('funcionarios')
                  .where('usuario_id', docente.usuarioId)
                  .first()

                if (funcionario) {
                  docenteDirector = {
                    id: docente.id,
                    nombre: funcionario.nombre,
                    apellido: funcionario.apellido,
                  }
                }
              }

              return {
                id: curso.id,
                nombre: curso.nombre,
                jornada: curso.jornada,
                gradoId: curso.gradoId,
                institucionId: curso.institucionId,
                docenteId: docenteDirector?.id || null,
                docente: docenteDirector,
                totalEstudiantes,
              }
            })
          )

          const totalCursos = cursosConInfo.length
          const totalEstudiantes = cursosConInfo.reduce(
            (sum, curso) => sum + curso.totalEstudiantes,
            0
          )

          return {
            id: grado.id,
            nombre: grado.nombre,
            orden: grado.orden,
            cursos: cursosConInfo,
            totalCursos,
            totalEstudiantes,
          }
        })
      )

      return response.ok({
        success: true,
        data: gradosConInfo,
      })
    } catch (error) {
      console.error('Error al listar grados:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar grados',
        error: error.message,
      })
    }
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
