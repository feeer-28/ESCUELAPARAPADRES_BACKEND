import type { HttpContext } from '@adonisjs/core/http'
import Funcionario from '#models/funcionario'
import Curso from '#models/curso'
import db from '@adonisjs/lucid/services/db'

export default class CoordinadoresController {
  /**
   * Dashboard general del coordinador
   * GET /coordinadores/estadisticas
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Solo los coordinadores pueden acceder a estas estadísticas',
        })
      }

      // Obtener institución del coordinador
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador || !coordinador.institucionId) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no tiene institución asignada',
        })
      }

      const institucionId = coordinador.institucionId

      // Total de cursos
      const totalCursosResult = await db
        .from('cursos')
        .where('institucion_id', institucionId)
        .count('* as total')
      const totalCursos = Number(totalCursosResult[0]?.total || 0)

      // Total de docentes (rolId: 5)
      const totalDocentesResult = await db
        .from('funcionarios')
        .where('institucion_id', institucionId)
        .where('rol_id', 5)
        .count('* as total')
      const totalDocentes = Number(totalDocentesResult[0]?.total || 0)

      // Total de orientadores (rolId: 4)
      const totalOrientadoresResult = await db
        .from('funcionarios')
        .where('institucion_id', institucionId)
        .where('rol_id', 4)
        .count('* as total')
      const totalOrientadores = Number(totalOrientadoresResult[0]?.total || 0)

      // Total de estudiantes
      const totalEstudiantesResult = await db
        .from('estudiantes as e')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .count('e.id as total')
      const totalEstudiantes = Number(totalEstudiantesResult[0]?.total || 0)

      // Tareas creadas en la institución
      const tareasResult = await db
        .from('asignaciones')
        .where('institucion_id', institucionId)
        .count('* as total')
      const tareasCreadas = Number(tareasResult[0]?.total || 0)

      // Calificaciones realizadas
      const calificacionesResult = await db
        .from('calificaciones')
        .where('institucion_id', institucionId)
        .count('* as total')
      const tareasCalificadas = Number(calificacionesResult[0]?.total || 0)

      const tareasPendientes = Math.max(0, tareasCreadas - tareasCalificadas)

      // Promedio general
      const promedioResult = await db
        .from('calificaciones')
        .where('institucion_id', institucionId)
        .avg('nota as promedio')
      const promedioGeneral = promedioResult[0]?.promedio
        ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
        : 0

      return response.status(200).json({
        success: true,
        data: {
          totalCursos,
          totalDocentes,
          totalOrientadores,
          totalEstudiantes,
          tareasCreadas,
          tareasCalificadas,
          tareasPendientes,
          promedioGeneral,
          cursosConAlerta: 0,
        },
      })
    } catch (error) {
      console.error('Error al obtener estadísticas del coordinador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  /**
   * Lista de cursos con métricas académicas
   * GET /coordinadores/cursos
   */
  async cursos({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      const cursos = await Curso.query()
        .where('institucion_id', institucionId)
        .preload('grado')
        .orderBy('grado_id')
        .orderBy('nombre')

      const cursosConMetricas = await Promise.all(
        cursos.map(async (curso) => {
          // Total estudiantes del curso
          const estudiantesResult = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .count('* as total')
          const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

          // Promedio general del curso
          const promedioResult = await db
            .from('calificaciones as c')
            .join('asignaciones as a', 'c.asignacion_id', 'a.id')
            .where('a.curso_id', curso.id)
            .avg('c.nota as promedio')

          const promedioGeneral = promedioResult[0]?.promedio
            ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
            : 0

          // Tareas del curso
          const tareasResult = await db
            .from('asignaciones')
            .where('curso_id', curso.id)
            .count('* as total')
          const tareasCreadas = Number(tareasResult[0]?.total || 0)

          return {
            id: curso.id,
            nombre: curso.nombre,
            grado: {
              id: curso.grado?.id,
              nombre: curso.grado?.nombre,
            },
            jornada: curso.jornada || 'No especificada',
            totalEstudiantes,
            promedioGeneral,
            tareasCreadas,
            tieneAlertas: promedioGeneral > 0 && promedioGeneral < 3.0,
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: cursosConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener cursos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener cursos',
        error: error.message,
      })
    }
  }

  /**
   * Alertas académicas consolidadas
   * GET /coordinadores/alertas
   */
  async alertas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId
      const alertas: any[] = []

      // Cursos con promedio bajo
      const cursos = await Curso.query().where('institucion_id', institucionId).preload('grado')

      for (const curso of cursos) {
        const promedioResult = await db
          .from('calificaciones as c')
          .join('asignaciones as a', 'c.asignacion_id', 'a.id')
          .where('a.curso_id', curso.id)
          .avg('c.nota as promedio')

        const promedio = promedioResult[0]?.promedio
          ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
          : 0

        if (promedio > 0 && promedio < 3.0) {
          alertas.push({
            tipo: 'promedio_bajo',
            nivel: 'critico',
            curso: {
              id: curso.id,
              nombre: curso.nombre,
            },
            mensaje: `Promedio general del curso por debajo de 3.0 (${promedio})`,
            fecha: new Date().toISOString(),
          })
        }
      }

      const resumen = {
        criticas: alertas.filter((a) => a.nivel === 'critico').length,
        moderadas: alertas.filter((a) => a.nivel === 'moderado').length,
        leves: alertas.filter((a) => a.nivel === 'leve').length,
      }

      return response.status(200).json({
        success: true,
        data: {
          alertas: alertas.sort((a, b) => {
            const nivelOrder: Record<string, number> = { critico: 0, moderado: 1, leve: 2 }
            return nivelOrder[a.nivel] - nivelOrder[b.nivel]
          }),
          resumen,
        },
      })
    } catch (error) {
      console.error('Error al obtener alertas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener alertas',
        error: error.message,
      })
    }
  }

  /**
   * Docentes con seguimiento académico
   * GET /coordinadores/docentes
   */
  async docentes({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      // Obtener docentes directamente de funcionarios con rol_id = 5
      const docentes = await db
        .from('funcionarios as f')
        .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('f.rol_id', 5)
        .select('f.id', 'f.nombre', 'f.apellido', 'u.correo')

      const docentesConMetricas = await Promise.all(
        docentes.map(async (docente) => {
          // Cursos asignados
          const cursosResult = await db
            .from('docente_cursos')
            .where('docente_id', docente.id)
            .count('* as total')

          // Tareas creadas
          const tareasResult = await db
            .from('asignaciones')
            .where('docente_id', docente.id)
            .count('* as total')
          const tareasCreadas = Number(tareasResult[0]?.total || 0)

          return {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            correo: docente.correo,
            cursosAsignados: Number(cursosResult[0]?.total || 0),
            tareasCreadas,
            estadoAcademico: 'bien',
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: docentesConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener docentes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener docentes',
        error: error.message,
      })
    }
  }

  /**
   * Orientadores con métricas de acompañamiento
   * GET /coordinadores/orientadores
   */
  async orientadores({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      // Obtener orientadores directamente de funcionarios con rol_id = 4
      const orientadores = await db
        .from('funcionarios as f')
        .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('f.rol_id', 4)
        .select('f.id', 'f.nombre', 'f.apellido', 'u.correo')

      const orientadoresConMetricas = orientadores.map((orientador) => {
        return {
          id: orientador.id,
          nombre: orientador.nombre,
          apellido: orientador.apellido,
          correo: orientador.correo,
          gradosAsignados: [],
          cursosAcompanados: 0,
          intervencionesAcademicas: 0,
          casosAcompanamiento: 0,
          cursosConAlerta: 0,
        }
      })

      return response.status(200).json({
        success: true,
        data: orientadoresConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener orientadores:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener orientadores',
        error: error.message,
      })
    }
  }

  /**
   * Detalle de rendimiento de un curso
   * GET /coordinadores/cursos/:id/rendimiento
   */
  async rendimientoCurso({ params, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const cursoId = params.id

      // Verificar que el curso pertenece a la institución del coordinador
      const curso = await Curso.query()
        .where('id', cursoId)
        .where('institucion_id', coordinador.institucionId)
        .first()

      if (!curso) {
        return response.status(404).json({
          success: false,
          message: 'Curso no encontrado o no pertenece a su institución',
        })
      }

      // Promedio general
      const promedioResult = await db
        .from('calificaciones as c')
        .join('asignaciones as a', 'c.asignacion_id', 'a.id')
        .where('a.curso_id', cursoId)
        .avg('c.nota as promedio')

      const promedioGeneral = promedioResult[0]?.promedio
        ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
        : 0

      // Distribución por rangos
      const calificaciones = await db
        .from('calificaciones as c')
        .join('asignaciones as a', 'c.asignacion_id', 'a.id')
        .where('a.curso_id', cursoId)
        .select('c.nota')

      const total = calificaciones.length
      const distribucion = { superior: 0, alto: 0, basico: 0, bajo: 0 }

      calificaciones.forEach((cal) => {
        const nota = Number(cal.nota)
        if (nota >= 4.6) distribucion.superior++
        else if (nota >= 4.0) distribucion.alto++
        else if (nota >= 3.0) distribucion.basico++
        else distribucion.bajo++
      })

      const distribucionRangos = {
        superior: {
          cantidad: distribucion.superior,
          porcentaje: total > 0 ? Math.round((distribucion.superior / total) * 100) : 0,
        },
        alto: {
          cantidad: distribucion.alto,
          porcentaje: total > 0 ? Math.round((distribucion.alto / total) * 100) : 0,
        },
        basico: {
          cantidad: distribucion.basico,
          porcentaje: total > 0 ? Math.round((distribucion.basico / total) * 100) : 0,
        },
        bajo: {
          cantidad: distribucion.bajo,
          porcentaje: total > 0 ? Math.round((distribucion.bajo / total) * 100) : 0,
        },
      }

      return response.status(200).json({
        success: true,
        data: {
          cursoId: curso.id,
          cursoNombre: curso.nombre,
          promedioGeneral,
          distribucionRangos,
          totalCalificaciones: total,
          tendencia: 'estable',
        },
      })
    } catch (error) {
      console.error('Error al obtener rendimiento del curso:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener rendimiento',
        error: error.message,
      })
    }
  }
}
