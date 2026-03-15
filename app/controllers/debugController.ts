import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class DebugController {
  /**
   * Verificar datos de una institución (SOLO PARA DEBUG)
   * GET /debug/institucion/:id
   */
  async verificarInstitucion({ params, response }: HttpContext) {
    try {
      const institucionId = params.id

      // Obtener información de la institución
      const institucion = await db
        .from('instituciones')
        .where('id', institucionId)
        .first()

      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      // Contar cursos
      const cursosCount = await db
        .from('cursos')
        .where('institucion_id', institucionId)
        .count('* as total')

      const cursos = await db
        .from('cursos')
        .where('institucion_id', institucionId)
        .select('id', 'nombre', 'grado_id', 'jornada')

      // Contar estudiantes por curso
      const estudiantesPorCurso = await Promise.all(
        cursos.map(async (curso) => {
          const count = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .count('* as total')

          const estudiantes = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .select('id', 'nombres', 'apellidos', 'numero_documento')
            .limit(10)

          return {
            curso: curso.nombre,
            cursoId: curso.id,
            totalEstudiantes: Number(count[0].total),
            estudiantesMuestra: estudiantes,
          }
        })
      )

      // Contar acudientes
      const acudientesCount = await db
        .from('acudientes as a')
        .join('estudiante_acudiente as ea', 'a.id', 'ea.acudiente_id')
        .join('estudiantes as e', 'ea.estudiante_id', 'e.id')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .countDistinct('a.id as total')

      const acudientes = await db
        .from('acudientes as a')
        .join('estudiante_acudiente as ea', 'a.id', 'ea.acudiente_id')
        .join('estudiantes as e', 'ea.estudiante_id', 'e.id')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .select('a.id', 'a.nombres', 'a.apellidos', 'a.numero_documento')
        .distinct()
        .limit(10)

      // Contar funcionarios (docentes, coordinadores, etc.)
      const funcionariosCount = await db
        .from('funcionarios')
        .where('institucion_id', institucionId)
        .count('* as total')

      const funcionarios = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .join('roles as r', 'u.rol_id', 'r.id')
        .where('f.institucion_id', institucionId)
        .select('f.id', 'f.nombre', 'f.apellido', 'r.nombre as rol')

      // Total de estudiantes en la institución
      const totalEstudiantes = await db
        .from('estudiantes as e')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .count('* as total')

      return response.status(200).json({
        success: true,
        data: {
          institucion: {
            id: institucion.id,
            nombre: institucion.nombre,
            nit: institucion.nit,
            codigoDane: institucion.codigo_dane,
          },
          resumen: {
            totalCursos: Number(cursosCount[0].total),
            totalEstudiantes: Number(totalEstudiantes[0].total),
            totalAcudientes: Number(acudientesCount[0].total),
            totalFuncionarios: Number(funcionariosCount[0].total),
          },
          cursos: estudiantesPorCurso,
          acudientesMuestra: acudientes,
          funcionarios: funcionarios,
        },
      })
    } catch (error) {
      console.error('Error al verificar institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al verificar institución',
        error: error.message,
      })
    }
  }
}
